import { randomUUID } from 'crypto'
import { API_METHODS, type ApiRequest, type ApiResponse } from '../shared/bridge'
import { REQUEST_TIMEOUT_MS, SERVER_URL } from './config'

/** Headers the main process adds; the renderer cannot set these. */
export interface ServerHeaders {
  token?: string
  companyId?: number | null
  /** Only before sign-in: the server answers in the first of fr / en it finds. */
  acceptLanguage?: string
}

/** Refuses anything that is not a plain server path, so a request can only reach SERVER_URL. */
export function checkRequest(request: ApiRequest): void {
  if (!API_METHODS.includes(request.method)) {
    throw new Error(`Method not allowed: ${String(request.method)}`)
  }
  const path = request.path
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
    throw new Error(`Not a server path: ${String(path)}`)
  }
  // The query string goes in request.query; no "..", backslashes, spaces or control characters.
  if (/[?#\\\s]|\.\./.test(path) || [...path].some((ch) => ch.charCodeAt(0) < 0x20)) {
    throw new Error(`Not a server path: ${path}`)
  }
}

function buildUrl(request: ApiRequest): string {
  const url = new URL(SERVER_URL + request.path)
  for (const [key, value] of Object.entries(request.query ?? {})) {
    if (value !== null && value !== undefined) url.searchParams.set(key, String(value))
  }
  return url.toString()
}

/** One call to the server. Never throws for HTTP errors: the status says what happened. */
export async function send(request: ApiRequest, server: ServerHeaders): Promise<ApiResponse> {
  checkRequest(request)
  const requestId = randomUUID()
  const headers: Record<string, string> = { Accept: 'application/json', 'X-Request-Id': requestId }
  if (server.token) headers['Authorization'] = `Bearer ${server.token}`
  if (server.companyId != null) headers['X-Company-Id'] = String(server.companyId)
  if (server.acceptLanguage) headers['Accept-Language'] = server.acceptLanguage
  if (request.headers?.['If-None-Match'])
    headers['If-None-Match'] = request.headers['If-None-Match']
  if (request.headers?.['Idempotency-Key']) {
    headers['Idempotency-Key'] = request.headers['Idempotency-Key']
  }
  const hasBody = request.body !== undefined
  if (hasBody) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(buildUrl(request), {
      method: request.method,
      headers,
      body: hasBody ? JSON.stringify(request.body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })
  } catch (e) {
    return {
      status: 0,
      requestId,
      etag: null,
      location: null,
      idempotentReplayed: false,
      body: null,
      networkError:
        e instanceof Error ? (e.cause instanceof Error ? e.cause.message : e.message) : String(e)
    }
  }

  const text = await res.text()
  let body: unknown = null
  if (text.length > 0) {
    try {
      body = JSON.parse(text)
    } catch {
      body = null
    }
  }
  return {
    status: res.status,
    requestId: res.headers.get('X-Request-Id') ?? requestId,
    etag: res.headers.get('ETag'),
    location: res.headers.get('Location'),
    idempotentReplayed: res.headers.get('Idempotent-Replayed') === 'true',
    body
  }
}
