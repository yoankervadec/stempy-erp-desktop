import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/client'
import { updateRecord } from '../api/records'
import { SERVER_MANAGED_FIELDS, type MetaField, type MetaResource, type Row } from '../api/types'
import { inlineCollections, toInput, toWire, type FormValues } from '../record/values'

/**
 * Edit list, as in NAV: the grid's cells become inputs, and each changed row is
 * saved on its own (a PATCH with its version and only the changed fields) when
 * the cursor leaves it, on Save, or when the list goes back to view mode.
 */

/** A row's pending changes, with the row they were made on (its version is the one sent). */
interface Draft {
  base: Row
  values: FormValues
}

/** Why a row did not save: messages by field, and one for the row itself. */
export interface RowProblem {
  title: string
  fields: Record<string, string>
  message?: string
}

/**
 * Whether the resource can be edited in its list. Documents can't: they are
 * written whole, header and lines together.
 */
export function canEditList(resource: MetaResource): boolean {
  return resource.can.update && inlineCollections(resource).length === 0
}

/** May this column be edited in the list. The record's own state (locks) is checked by the server. */
export function canEditInList(f: MetaField): boolean {
  return f.writable.update && !(SERVER_MANAGED_FIELDS as readonly string[]).includes(f.name)
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

export interface ListEditor {
  editing: boolean
  setEditing: (on: boolean) => void
  /** The row as last saved here, if newer than the list's copy. */
  shown: (row: Row) => Row
  value: (row: Row, f: MetaField) => unknown
  setValue: (row: Row, f: MetaField, value: unknown) => void
  isDirty: (row: Row) => boolean
  isSaving: (row: Row) => boolean
  problem: (row: Row) => RowProblem | undefined
  dirty: boolean
  saving: boolean
  problems: [string, RowProblem][]
  conflicts: [string, Row][]
  saveRow: (key: string) => Promise<boolean>
  saveAll: () => Promise<boolean>
  discard: () => void
  /** A conflict: take the row as it is now and drop the changes. */
  reload: (key: string) => void
  /** A conflict: keep the changes, on top of the row as it is now (saved on the next save). */
  keepMine: (key: string) => void
  keyOf: (row: Row) => string
}

export function useListEditor(
  resource: MetaResource,
  rows: Row[],
  messages: { conflict: string; rowLabel: (row: Row) => string }
): ListEditor {
  const [editing, setEditing] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  /** What the server answered to a save: newer than the list until it is fetched again. */
  const [saved, setSaved] = useState<Record<string, Row>>({})
  const [problems, setProblems] = useState<Record<string, RowProblem>>({})
  const [conflicts, setConflicts] = useState<Record<string, Row>>({})
  const [saving, setSaving] = useState<Record<string, true>>({})

  // A fresh list from the server is newer than what was saved here.
  const [seenRows, setSeenRows] = useState(rows)
  if (seenRows !== rows) {
    setSeenRows(rows)
    setSaved({})
  }

  // The saves are async: they read the latest drafts, not the render's.
  const draftsRef = useRef(drafts)
  useEffect(() => {
    draftsRef.current = drafts
  }, [drafts])

  const keyOf = useCallback((row: Row) => String(row[resource.idField]), [resource.idField])
  const shown = useCallback((row: Row): Row => saved[keyOf(row)] ?? row, [saved, keyOf])

  const without = <T>(map: Record<string, T>, key: string): Record<string, T> => {
    const next = { ...map }
    delete next[key]
    return next
  }

  const saveRow = async (key: string): Promise<boolean> => {
    const draft = draftsRef.current[key]
    if (!draft || saving[key]) return !draft
    const body: Record<string, unknown> = {}
    if (resource.versionField) body[resource.versionField] = draft.base[resource.versionField]
    let changed = false
    for (const [name, input] of Object.entries(draft.values)) {
      const f = resource.fields.find((x) => x.name === name)
      if (!f) continue
      const wire = toWire(f, input)
      if (!same(wire, draft.base[name])) {
        body[name] = wire
        changed = true
      }
    }
    if (!changed) {
      // Back to what is stored: nothing to send, and nothing wrong with the row.
      setDrafts((d) => without(d, key))
      setProblems((p) => without(p, key))
      return true
    }
    setSaving((s) => ({ ...s, [key]: true }))
    try {
      const row = await updateRecord(resource, Number(key), body)
      setSaved((s) => ({ ...s, [key]: row }))
      // Changes typed while the save ran stay as a new draft on the saved row.
      setDrafts((d) => {
        const now = d[key]
        if (!now || now === draft) return without(d, key)
        return { ...d, [key]: { base: row, values: now.values } }
      })
      setProblems((p) => without(p, key))
      return true
    } catch (e) {
      const title = messages.rowLabel(draft.base)
      if (e instanceof ApiError && e.code === 'VERSION_CONFLICT' && e.problem.current) {
        setConflicts((c) => ({ ...c, [key]: e.problem.current! }))
        setProblems((p) => ({ ...p, [key]: { title, fields: {}, message: messages.conflict } }))
      } else if (e instanceof ApiError) {
        const fields: Record<string, string> = {}
        const other: string[] = []
        for (const fe of e.problem.errors ?? []) {
          if (resource.fields.some((f) => f.name === fe.field)) fields[fe.field] = fe.message
          else other.push(fe.message)
        }
        const message =
          other.join(' ') ||
          (Object.keys(fields).length === 0
            ? [e.problem.title, e.problem.detail].filter(Boolean).join(': ')
            : undefined)
        setProblems((p) => ({ ...p, [key]: { title, fields, message } }))
      } else {
        setProblems((p) => ({ ...p, [key]: { title, fields: {}, message: String(e) } }))
      }
      return false
    } finally {
      setSaving((s) => without(s, key))
    }
  }

  const saveAll = async (): Promise<boolean> => {
    let ok = true
    // One row after the other: the server sees them in order, and errors stay readable.
    for (const key of Object.keys(draftsRef.current)) {
      if (!(await saveRow(key))) ok = false
    }
    return ok
  }

  const drop = (key: string): void => {
    setProblems((p) => without(p, key))
    setConflicts((c) => without(c, key))
  }

  return {
    editing,
    setEditing,
    shown,
    value: (row, f) => {
      const draft = drafts[keyOf(row)]
      return draft && f.name in draft.values ? draft.values[f.name] : toInput(f, row[f.name])
    },
    setValue: (row, f, value) => {
      const key = keyOf(row)
      setDrafts((d) => ({
        ...d,
        [key]: { base: d[key]?.base ?? row, values: { ...d[key]?.values, [f.name]: value } }
      }))
      // The field's error goes once it is edited again.
      setProblems((p) => {
        const pr = p[key]
        if (!pr?.fields[f.name]) return p
        const fields = without(pr.fields, f.name)
        if (Object.keys(fields).length === 0 && !pr.message) return without(p, key)
        return { ...p, [key]: { ...pr, fields } }
      })
    },
    isDirty: (row) => keyOf(row) in drafts,
    isSaving: (row) => keyOf(row) in saving,
    problem: (row) => problems[keyOf(row)],
    dirty: Object.keys(drafts).length > 0,
    saving: Object.keys(saving).length > 0,
    problems: Object.entries(problems),
    conflicts: Object.entries(conflicts),
    saveRow,
    saveAll,
    discard: () => {
      setDrafts({})
      setProblems({})
      setConflicts({})
    },
    reload: (key) => {
      const current = conflicts[key]
      if (current) setSaved((s) => ({ ...s, [key]: current }))
      setDrafts((d) => without(d, key))
      drop(key)
    },
    keepMine: (key) => {
      const current = conflicts[key]
      if (!current) return
      setSaved((s) => ({ ...s, [key]: current }))
      setDrafts((d) => (d[key] ? { ...d, [key]: { ...d[key], base: current } } : d))
      drop(key)
    },
    keyOf
  }
}

/** The editor, for the grid's cells (their renderers are fixed when the columns are made). */
export const ListEditorContext = createContext<ListEditor | null>(null)

export function useListEditorContext(): ListEditor | null {
  return useContext(ListEditorContext)
}
