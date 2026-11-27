import type {
  LayoutCollection,
  MetaField,
  MetaParam,
  MetaResource,
  RecordMeta,
  Row
} from '../api/types'
import { isLocked, isNewRecordMeta, SERVER_MANAGED_FIELDS } from '../api/types'

/**
 * Form values hold what the inputs edit, not the wire values:
 * strings for text, numbers, decimals and dates (so a half-typed "1," stays as
 * typed), local "YYYY-MM-DDTHH:mm" for instants, booleans, enum constants and
 * reference ids as they are. toWire turns them back for the server.
 */
export type FormValues = Record<string, unknown>

/** A document line in the form: its stored id (none when added) and a stable key for React. */
export interface FormLine extends FormValues {
  id?: number
  _key: string
}

type Typed = MetaField | MetaParam

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** An instant as the user's local wall time, for <input type="datetime-local">. */
function instantToLocalInput(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function toInput(f: Typed, wire: unknown): unknown {
  switch (f.type) {
    case 'string':
    case 'integer':
    case 'decimal':
    case 'date':
      return wire === null || wire === undefined ? '' : String(wire)
    case 'timestamp':
      return typeof wire === 'string' ? instantToLocalInput(wire) : ''
    default:
      return wire ?? null
  }
}

/**
 * What the server gets. Text the input can't make sense of is sent as typed:
 * the server answers with a field error (INVALID_VALUE) on that field, so the
 * client doesn't duplicate its checks.
 */
export function toWire(f: Typed, input: unknown): unknown {
  if (input === undefined || input === null) return null
  switch (f.type) {
    case 'string':
      return input === '' ? null : input
    case 'integer': {
      const s = String(input).trim()
      if (s === '') return null
      return /^-?\d+$/.test(s) && Number.isSafeInteger(Number(s)) ? Number(s) : s
    }
    case 'decimal': {
      const s = String(input).trim()
      return s === '' ? null : s.replace(',', '.')
    }
    case 'date': {
      const s = String(input).trim()
      return s === '' ? null : s
    }
    case 'timestamp': {
      const s = String(input).trim()
      if (s === '') return null
      const d = new Date(s)
      return Number.isNaN(d.getTime()) ? s : d.toISOString().replace(/\.\d{3}Z$/, 'Z')
    }
    default:
      return input
  }
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

let lineKey = 0
export function newLineKey(): string {
  return `l${++lineKey}`
}

/** Collections whose lines come inside the record (documents). */
export function inlineCollections(resource: MetaResource): LayoutCollection[] {
  return resource.layout.collections.filter((c) => c.source === null)
}

function fieldByName(resource: MetaResource, name: string): MetaField | undefined {
  return resource.fields.find((f) => f.name === name)
}

/** The header fields the form shows: every section's fields, in order. */
export function sectionFields(resource: MetaResource): MetaField[] {
  const out: MetaField[] = []
  for (const section of resource.layout.sections) {
    for (const name of section.fields) {
      const f = fieldByName(resource, name)
      if (f && !out.includes(f)) out.push(f)
    }
  }
  return out
}

/** The form's values from a record as the server sent it. */
export function toFormValues(resource: MetaResource, row: Row): FormValues {
  const values: FormValues = {}
  for (const f of sectionFields(resource)) values[f.name] = toInput(f, row[f.name])
  for (const c of inlineCollections(resource)) {
    const lines = (row[c.name] as Row[] | undefined) ?? []
    values[c.name] = lines.map((line) => lineToForm(c, line))
  }
  return values
}

export function lineToForm(c: LayoutCollection, line: Row): FormLine {
  const out: FormLine = { _key: newLineKey() }
  if (typeof line.id === 'number') out.id = line.id
  for (const col of c.columns) out[col.name] = toInput(col, line[col.name])
  return out
}

/** Whether the record is new (from GET /new) rather than stored. */
export function isNew(row: Row): boolean {
  return isNewRecordMeta(row._meta)
}

function recordMeta(row: Row): RecordMeta | undefined {
  return isNewRecordMeta(row._meta) ? undefined : row._meta
}

/** May the user edit this header field now: permissions, the record's state, the field's access. */
export function canEditField(row: Row, f: MetaField): boolean {
  if ((SERVER_MANAGED_FIELDS as readonly string[]).includes(f.name)) return false
  if (isNew(row)) return f.writable.create
  const meta = recordMeta(row)
  return f.writable.update && !!meta?.can.update && !isLocked(meta, f.name)
}

/** May the user change this collection's lines now. */
export function canEditCollection(row: Row, c: LayoutCollection): boolean {
  if (!c.editable) return false
  if (isNew(row)) return true
  const meta = recordMeta(row)
  return !!meta?.can.update && !isLocked(meta, c.name)
}

export function canEditColumn(row: Row, c: LayoutCollection, col: MetaField): boolean {
  if (!canEditCollection(row, c)) return false
  if ((SERVER_MANAGED_FIELDS as readonly string[]).includes(col.name)) return false
  return isNew(row) ? col.writable.create : col.writable.update
}

/** Each editable line as sent: existing ones with their id and changed columns, new ones whole. */
function linesBody(
  row: Row,
  c: LayoutCollection,
  stored: Row[],
  lines: FormLine[]
): { body: Record<string, unknown>[]; changed: boolean } {
  let changed = lines.length !== stored.length
  const body = lines.map((line, index) => {
    const before = line.id == null ? undefined : stored.find((s) => s.id === line.id)
    if (!before) {
      changed = true
      const out: Record<string, unknown> = {}
      for (const col of c.columns) {
        if (!col.writable.create) continue
        const w = toWire(col, line[col.name])
        if (w !== null) out[col.name] = w
      }
      return out
    }
    if (stored[index]?.id !== line.id) changed = true
    const out: Record<string, unknown> = { id: line.id }
    for (const col of c.columns) {
      if (!canEditColumn(row, c, col)) continue
      const w = toWire(col, line[col.name])
      if (!same(w, before[col.name])) {
        out[col.name] = w
        changed = true
      }
    }
    return out
  })
  return { body, changed }
}

/**
 * The body of a create (POST): every writable field that has a value, and
 * each editable collection's lines. Empty fields are left out, so the server
 * applies its own defaults (and reports REQUIRED where one is missing).
 */
export function createBody(
  resource: MetaResource,
  row: Row,
  values: FormValues
): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  for (const f of sectionFields(resource)) {
    if (!canEditField(row, f)) continue
    const w = toWire(f, values[f.name])
    if (w !== null) body[f.name] = w
  }
  for (const c of inlineCollections(resource)) {
    if (!canEditCollection(row, c)) continue
    body[c.name] = linesBody(row, c, [], (values[c.name] as FormLine[]) ?? []).body
  }
  return body
}

/**
 * The body of an update (PATCH): the version last read and only what changed.
 * A collection is sent whole (every line, by id) when any of its lines changed,
 * was added or removed; otherwise it is left out and keeps its lines.
 */
export function patchBody(
  resource: MetaResource,
  row: Row,
  values: FormValues
): { body: Record<string, unknown>; changed: boolean } {
  const body: Record<string, unknown> = {}
  if (resource.versionField) body[resource.versionField] = row[resource.versionField]
  let changed = false
  for (const f of sectionFields(resource)) {
    if (!canEditField(row, f)) continue
    const w = toWire(f, values[f.name])
    if (!same(w, row[f.name])) {
      body[f.name] = w
      changed = true
    }
  }
  for (const c of inlineCollections(resource)) {
    if (!canEditCollection(row, c)) continue
    const stored = (row[c.name] as Row[] | undefined) ?? []
    const lines = linesBody(row, c, stored, (values[c.name] as FormLine[]) ?? [])
    if (lines.changed) {
      body[c.name] = lines.body
      changed = true
    }
  }
  return { body, changed }
}

/** "lines[2].quantity" (the server's path) as a form path: "lines.2.quantity". */
export function formPath(serverPath: string): string {
  return serverPath.replace(/\[(\d+)\]/g, '.$1')
}

/**
 * The exact sum of decimal strings, for a collection's footer: no float
 * arithmetic, so "0.10" + "0.20" is "0.30". Values that aren't decimals are skipped.
 */
export function sumDecimals(values: unknown[]): string | null {
  const parsed: { int: bigint; scale: number }[] = []
  for (const v of values) {
    if (v === null || v === undefined || v === '') continue
    const s = String(v).trim().replace(',', '.')
    const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(s)
    if (!m) continue
    const frac = m[3] ?? ''
    parsed.push({ int: BigInt(`${m[1]}${m[2]}${frac}`), scale: frac.length })
  }
  if (parsed.length === 0) return null
  const scale = Math.max(...parsed.map((p) => p.scale))
  let total = 0n
  for (const p of parsed) total += p.int * 10n ** BigInt(scale - p.scale)
  const negative = total < 0n
  const digits = (negative ? -total : total).toString().padStart(scale + 1, '0')
  const whole = digits.slice(0, digits.length - scale)
  const frac = digits.slice(digits.length - scale)
  return `${negative ? '-' : ''}${whole}${scale > 0 ? `.${frac}` : ''}`
}
