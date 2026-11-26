import type { ApiRequest, ApiResponse } from '../../../src/shared/bridge'
import type { Problem } from './types'

/**
 * A failed call: the server's problem body (RFC 7807), or one made up here when
 * the server could not be reached (status 0, code NETWORK_ERROR) or sent no body.
 * Test `code`, never `message`.
 */
export class ApiError extends Error {
  readonly status: number
  readonly problem: Problem

  constructor(response: ApiResponse) {
    const problem = toProblem(response)
    super(problem.detail ?? problem.title)
    this.name = 'ApiError'
    this.status = response.status
    this.problem = problem
  }

  get code(): string {
    return this.problem.code
  }

  get requestId(): string | undefined {
    return this.problem.requestId
  }
}

function isProblem(body: unknown): body is Problem {
  return typeof body === 'object' && body !== null && typeof (body as Problem).code === 'string'
}

function toProblem(response: ApiResponse): Problem {
  const requestId = response.requestId || undefined
  if (isProblem(response.body)) {
    return { ...response.body, requestId: response.body.requestId ?? requestId }
  }
  if (response.status === 0) {
    return {
      type: 'urn:stempy:problem:network_error',
      title: 'Server unreachable',
      status: 0,
      detail: response.networkError,
      code: 'NETWORK_ERROR',
      requestId
    }
  }
  return {
    type: 'about:blank',
    title: `HTTP ${response.status}`,
    status: response.status,
    code: `HTTP_${response.status}`,
    requestId
  }
}

/** Whether the call succeeded (2xx), or was a 304 the caller asked for with If-None-Match. */
function ok(response: ApiResponse, request: ApiRequest): boolean {
  if (response.status >= 200 && response.status < 300) return true
  return response.status === 304 && !!request.headers?.['If-None-Match']
}

/** The raw call: the response when it succeeded, else an ApiError. */
export async function call(request: ApiRequest): Promise<ApiResponse> {
  const response = await window.stempy.api.request(request)
  if (!ok(response, request)) throw new ApiError(response)
  return response
}

/** The call's JSON body, typed by the caller. */
export async function callJson<T>(request: ApiRequest): Promise<T> {
  return (await call(request)).body as T
}
