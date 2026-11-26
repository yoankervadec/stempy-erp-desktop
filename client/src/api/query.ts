import { callJson } from './client'
import type { ListResponse, MetaResource, QuerySpec, Row } from './types'

/** QUERY {path}: server-side filter, sort and paging. */
export function queryList(resource: MetaResource, spec: QuerySpec): Promise<ListResponse<Row>> {
  return callJson<ListResponse<Row>>({ method: 'QUERY', path: resource.path, body: spec })
}

/** The QUERY sort: the user's, else the resource's own first order. */
export function sortOrDefault(resource: MetaResource, sort: QuerySpec['sort']): QuerySpec['sort'] {
  return sort && sort.length > 0 ? sort : resource.defaultSort
}
