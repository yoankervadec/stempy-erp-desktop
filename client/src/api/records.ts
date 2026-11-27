import { call, callJson } from './client'
import type {
  CalculateResponse,
  HistoryEntry,
  Id,
  ListResponse,
  MetaAction,
  MetaResource,
  Row
} from './types'

/** The TanStack Query key of one record (null: the blank one of GET /new). */
export function recordQueryKey(r: MetaResource, id: Id | null): unknown[] {
  return ['record', r.key, id ?? 'new']
}

const one = (r: MetaResource, id: Id): string => `${r.path}/${id}`

/** GET {path}/{id}: the row with _refs and _meta (documents: with their lines). */
export function getRecord(r: MetaResource, id: Id): Promise<Row> {
  return callJson<Row>({ method: 'GET', path: one(r, id) })
}

/** GET {path}/new: a blank record with the server's defaults; nothing is saved. */
export function getNewRecord(r: MetaResource): Promise<Row> {
  return callJson<Row>({ method: 'GET', path: `${r.path}/new` })
}

export function createRecord(r: MetaResource, body: Record<string, unknown>): Promise<Row> {
  return callJson<Row>({ method: 'POST', path: r.path, body })
}

/** PATCH with the version last read and only the changed fields. */
export function updateRecord(r: MetaResource, id: Id, body: Record<string, unknown>): Promise<Row> {
  return callJson<Row>({ method: 'PATCH', path: one(r, id), body })
}

export async function deleteRecord(r: MetaResource, id: Id, version: number): Promise<void> {
  await call({ method: 'DELETE', path: one(r, id), query: { version } })
}

/** POST {path}/calculate or {path}/{id}/calculate: the draft recalculated, nothing saved. */
export function calculateRecord(
  r: MetaResource,
  id: Id | null,
  body: Record<string, unknown>
): Promise<CalculateResponse> {
  const path = id == null ? `${r.path}/calculate` : `${one(r, id)}/calculate`
  return callJson<CalculateResponse>({ method: 'POST', path, body })
}

export function getHistory(
  r: MetaResource,
  id: Id,
  page: { limit: number; offset: number }
): Promise<ListResponse<HistoryEntry>> {
  return callJson<ListResponse<HistoryEntry>>({
    method: 'GET',
    path: `${one(r, id)}/history`,
    query: page
  })
}

/** Runs an action; `id` fills "{id}" for record actions. Answers the server's body (often a row). */
export async function runAction(
  action: MetaAction,
  id: Id | null,
  params: Record<string, unknown>
): Promise<{ status: number; body: unknown }> {
  const path = id == null ? action.path : action.path.replace('{id}', String(id))
  // Actions without parameters (close, reopen) take no body.
  const body = action.params.length > 0 ? params : undefined
  const response = await call({ method: action.method, path, body })
  return { status: response.status, body: response.body }
}
