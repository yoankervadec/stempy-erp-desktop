import type { SortingState } from '@tanstack/react-table'
import type { MetaResource } from '../api/types'
import { filterableFields, filterChoices, type AppliedFilter, type FilterChoice } from './filters'

/**
 * Saved views of a list, as in Business Central: named sets of filters, search
 * and sort. Kept as the preference "views.<resourceKey>@<companyId>": a filter
 * value can name a record of one company (a reference id), so views are per
 * company. The text shown for each value is kept with it, so a view shows
 * names, not ids, without asking the server.
 */

export interface SavedFilter {
  field: string
  choice: FilterChoice
  value?: unknown
  display: string
}

export interface ListView {
  id: string
  name: string
  filters: SavedFilter[]
  search?: string
  sort?: { field: string; dir: 'asc' | 'desc' }[]
}

export interface ListViews {
  views: ListView[]
  /** The view the list opens on; none: all records. */
  last?: string
}

export const EMPTY_VIEWS: ListViews = { views: [] }
export const MAX_VIEWS = 30
export const MAX_VIEW_NAME = 60

export function viewsKey(resourceKey: string, companyId: number): string {
  return `views.${resourceKey}@${companyId}`
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isListViews(value: unknown): value is ListViews {
  return isObject(value) && Array.isArray(value.views)
}

/**
 * The views as the resource is now: a filter on a field no longer filterable,
 * or with an operator no longer offered, is dropped; so is a sort key on a
 * field no longer sortable.
 */
export function readViews(resource: MetaResource, stored: ListViews): ListViews {
  const fields = new Map(filterableFields(resource).map((f) => [f.name, f]))
  const sortable = new Set(resource.fields.filter((f) => f.sortable).map((f) => f.name))
  const views: ListView[] = []
  for (const v of stored.views) {
    if (!isObject(v) || typeof v.id !== 'string' || typeof v.name !== 'string') continue
    const filters = (Array.isArray(v.filters) ? v.filters : []).filter(
      (f): f is SavedFilter =>
        isObject(f) &&
        typeof f.field === 'string' &&
        typeof f.display === 'string' &&
        fields.has(f.field) &&
        filterChoices(fields.get(f.field)!).includes(f.choice as FilterChoice)
    )
    const sort = Array.isArray(v.sort)
      ? v.sort.filter(
          (s): s is { field: string; dir: 'asc' | 'desc' } =>
            isObject(s) && typeof s.field === 'string' && sortable.has(s.field)
        )
      : undefined
    views.push({
      id: v.id,
      name: v.name,
      filters,
      ...(typeof v.search === 'string' && v.search ? { search: v.search } : {}),
      ...(sort ? { sort } : {})
    })
  }
  const last = views.some((v) => v.id === stored.last) ? stored.last : undefined
  return { views, ...(last ? { last } : {}) }
}

let nextId = 0

/** A view's filters, applied: each gets an id of its own in the pane. */
export function toApplied(view: ListView | undefined): AppliedFilter[] {
  return (view?.filters ?? []).map((f) => ({ ...f, value: f.value, id: `v${++nextId}` }))
}

export function toSaved(filters: AppliedFilter[]): SavedFilter[] {
  return filters.map(({ field, choice, value, display }) => ({
    field,
    choice,
    ...(value !== undefined ? { value } : {}),
    display
  }))
}

export function toSort(sorting: SortingState): { field: string; dir: 'asc' | 'desc' }[] {
  return sorting.map((s) => ({ field: s.id, dir: s.desc ? 'desc' : 'asc' }))
}

/** Whether the list shows what the view says (its sort only if it has one). */
export function sameAsView(
  view: ListView,
  filters: AppliedFilter[],
  search: string,
  sorting: SortingState
): boolean {
  const key = (f: SavedFilter[]): string =>
    JSON.stringify(f.map((x) => [x.field, x.choice, x.value ?? null]))
  return (
    key(view.filters) === key(toSaved(filters)) &&
    (view.search ?? '') === search &&
    (!view.sort || JSON.stringify(view.sort) === JSON.stringify(toSort(sorting)))
  )
}

export function newViewId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
