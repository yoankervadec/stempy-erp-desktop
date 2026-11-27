import type {
  ColumnOrderState,
  ColumnSizingState,
  SortingState,
  VisibilityState
} from '@tanstack/react-table'
import type { MetaField, MetaResource } from '../api/types'

/**
 * How the user laid a list out, kept per resource as the preference
 * "list.<resourceKey>". Every part is optional: what is missing is the
 * server's default. Read against the resource as /meta describes it now, so a
 * field the server no longer sends is dropped and a new one shows up in its
 * default place.
 */
export interface ListLayout {
  /** Column names, left to right. */
  order?: string[]
  /** Shown or hidden, by column name. */
  visible?: Record<string, boolean>
  /** Widths in pixels, by column name. */
  widths?: Record<string, number>
  /** Sort keys; [] means the resource's default sort. */
  sort?: { field: string; dir: 'asc' | 'desc' }[]
  pageSize?: number
}

export const EMPTY_LAYOUT: ListLayout = {}

export const PAGE_SIZES = [25, 50, 100, 200]
export const DEFAULT_PAGE_SIZE = 50
export const MIN_WIDTH = 40
export const MAX_WIDTH = 800

/** The shape only; values are checked when read, field by field. */
export function isListLayout(value: unknown): value is ListLayout {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** The listColumns in the server's order, then every other field. */
export function defaultOrder(resource: MetaResource): string[] {
  const known = new Set(resource.fields.map((f) => f.name))
  const first = resource.listColumns.filter((name) => known.has(name))
  return [...first, ...resource.fields.map((f) => f.name).filter((n) => !first.includes(n))]
}

/**
 * The saved order, without fields that are gone; a field it does not name (new
 * since) goes after the field it follows in the default order.
 */
export function resolveOrder(resource: MetaResource, saved: unknown): ColumnOrderState {
  const defaults = defaultOrder(resource)
  if (!Array.isArray(saved)) return defaults
  const known = new Set(defaults)
  const out = [...new Set(saved.filter((n): n is string => typeof n === 'string' && known.has(n)))]
  defaults.forEach((name, i) => {
    if (out.includes(name)) return
    const before = defaults
      .slice(0, i)
      .reverse()
      .find((n) => out.includes(n))
    out.splice(before ? out.indexOf(before) + 1 : 0, 0, name)
  })
  return out
}

/** Shown first: the resource's listColumns; the user's choices over them. */
export function resolveVisibility(resource: MetaResource, saved: unknown): VisibilityState {
  const listed = new Set(resource.listColumns)
  const choices = isRecord(saved) ? saved : {}
  return Object.fromEntries(
    resource.fields.map((f) => {
      const choice = choices[f.name]
      return [
        f.name,
        typeof choice === 'boolean' ? choice : listed.size === 0 || listed.has(f.name)
      ]
    })
  )
}

/** The user's widths, for columns that still exist; the others keep their default. */
export function resolveWidths(resource: MetaResource, saved: unknown): ColumnSizingState {
  if (!isRecord(saved)) return {}
  const out: ColumnSizingState = {}
  for (const f of resource.fields) {
    const w = saved[f.name]
    if (typeof w === 'number' && Number.isFinite(w)) {
      out[f.name] = Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w)))
    }
  }
  return out
}

/** The saved sort on fields still sortable; never saved: the resource's default sort. */
export function resolveSorting(resource: MetaResource, saved: unknown): SortingState {
  const keys = Array.isArray(saved) ? saved : resource.defaultSort
  const sortable = new Set(
    resource.fields.filter((f) => f.sortable || !Array.isArray(saved)).map((f) => f.name)
  )
  return keys
    .filter(
      (s): s is { field: string; dir: 'asc' | 'desc' } =>
        isRecord(s) && typeof s.field === 'string' && sortable.has(s.field)
    )
    .map((s) => ({ id: s.field, desc: s.dir === 'desc' }))
}

export function resolvePageSize(saved: unknown): number {
  return typeof saved === 'number' && PAGE_SIZES.includes(saved) ? saved : DEFAULT_PAGE_SIZE
}

/** A column's width before the user changes it: from its type, and the header's length. */
export function defaultWidth(f: MetaField): number {
  const byType: Record<MetaField['type'], number> = {
    string: f.format === 'multiline' ? 240 : textWidth(f.maxLength),
    integer: 90,
    decimal: 110,
    boolean: 70,
    date: 100,
    timestamp: 150,
    enum: 130,
    reference: 180
  }
  // Room for the label and a sort arrow.
  const header = f.label.length * 7 + 28
  return Math.min(320, Math.max(byType[f.type], header))
}

function textWidth(maxLength: number | undefined): number {
  if (!maxLength) return 200
  return Math.min(280, Math.max(80, maxLength * 6))
}

/** The order with one column moved before or after another. */
export function moveColumn(
  order: string[],
  id: string,
  target: string,
  side: 'before' | 'after'
): string[] {
  if (id === target) return order
  const out = order.filter((n) => n !== id)
  const at = out.indexOf(target)
  if (at < 0) return order
  out.splice(side === 'before' ? at : at + 1, 0, id)
  return out
}
