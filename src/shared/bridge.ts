/**
 * The contract between the renderer and the main process.
 *
 * The main process owns the session token and makes every HTTP call to the
 * server, so the token never reaches the renderer and no CORS setup is needed.
 * The renderer sees the session without its token.
 *
 * Plain data only: everything here crosses the IPC boundary (structured clone).
 */

/** The HTTP methods the renderer may ask for. QUERY is the server's search method. */
export const API_METHODS = ['GET', 'QUERY', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
export type ApiMethod = (typeof API_METHODS)[number]

/** The request headers the renderer may set; the main process adds the rest. */
export interface ApiRequestHeaders {
  'If-None-Match'?: string
  'Idempotency-Key'?: string
}

export interface ApiRequest {
  method: ApiMethod
  /** A path on the server, starting with "/": "/masterdata/products/7". */
  path: string
  /** Appended as a query string; null and undefined values are left out. */
  query?: Record<string, string | number | boolean | null | undefined>
  /** Sent as JSON. */
  body?: unknown
  headers?: ApiRequestHeaders
}

export interface ApiResponse {
  /** The HTTP status, or 0 when the server could not be reached. */
  status: number
  /** The X-Request-Id this request was sent with (the server echoes it). */
  requestId: string
  etag: string | null
  location: string | null
  idempotentReplayed: boolean
  /** Parsed JSON, or null (204, 304, an empty body). */
  body: unknown
  /** With status 0: why the server could not be reached. */
  networkError?: string
}

/** The user's own language choice; null means "each company's default". */
export type LanguageChoice = 'fr' | 'en' | null

/** The login answer, without its token, plus the company this session acts in. */
export interface SessionInfo {
  user: { id: number; userNo: string; name: string; language: LanguageChoice }
  companies: { id: number; code: string; description: string | null }[]
  defaultCompanyId: number | null
  /** Sent as X-Company-Id. Null until one is chosen (several companies, no default). */
  companyId: number | null
  expiresAt: string
}

/** Login, language change: the server's answer, and the session when it succeeded. */
export interface SessionResult {
  response: ApiResponse
  session: SessionInfo | null
}

/** What the preload script exposes as `window.stempy`. */
export interface StempyBridge {
  session: {
    /** The current session, or null when signed out. Survives a renderer reload. */
    get(): Promise<SessionInfo | null>
    login(userNo: string, password: string): Promise<SessionResult>
    logout(): Promise<void>
    /** Choose the company every later request acts in. */
    setCompany(companyId: number): Promise<SessionInfo>
    /** PATCH /auth/me { language }. */
    setLanguage(language: LanguageChoice): Promise<SessionResult>
    /** Called when the server ends the session (any 401). Returns an unsubscribe. */
    onEnded(listener: () => void): () => void
  }
  api: {
    request(request: ApiRequest): Promise<ApiResponse>
  }
}

/** IPC channel names. */
export const IPC = {
  sessionGet: 'stempy:session:get',
  sessionLogin: 'stempy:session:login',
  sessionLogout: 'stempy:session:logout',
  sessionSetCompany: 'stempy:session:setCompany',
  sessionSetLanguage: 'stempy:session:setLanguage',
  sessionEnded: 'stempy:session:ended',
  apiRequest: 'stempy:api:request'
} as const
