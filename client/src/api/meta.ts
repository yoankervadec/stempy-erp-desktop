import { call } from './client'
import type { Meta } from './types'

/**
 * GET /meta with If-None-Match. The last answer is kept here with its ETag; a
 * 304 hands it back. The ETag is a hash of the body (it differs per company,
 * language and permission set), so a 304 always means "this exact body".
 */
let cached: { etag: string; meta: Meta } | null = null

export async function fetchMeta(): Promise<Meta> {
  const response = await call({
    method: 'GET',
    path: '/meta',
    headers: cached ? { 'If-None-Match': cached.etag } : undefined
  })
  if (response.status === 304 && cached) return cached.meta
  const meta = response.body as Meta
  cached = response.etag ? { etag: response.etag, meta } : null
  return meta
}

export function forgetMeta(): void {
  cached = null
}
