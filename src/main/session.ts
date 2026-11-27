import { app, BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron'
import {
  IPC,
  type ApiRequest,
  type ApiResponse,
  type LanguageChoice,
  type SessionInfo,
  type SessionResult
} from '../shared/bridge'
import { checkRequest, send } from './http'
import { clearLocalPreferences, readLocalPreferences, writeLocalPreference } from './preferences'

/**
 * The signed-in session. The token stays here, in memory: it is never sent to
 * the renderer and never written to disk. Quitting the app signs out.
 */
interface Session {
  token: string
  info: SessionInfo
}

let session: Session | null = null

/** Wire shape of POST /auth/login (API_GUIDE section 4); only what the session keeps. */
interface LoginBody {
  token: string
  expiresAt: string
  user: SessionInfo['user']
  companies: SessionInfo['companies']
  defaultCompanyId: number | null
}

function isLoginBody(body: unknown): body is LoginBody {
  const b = body as LoginBody | null
  return !!b && typeof b.token === 'string' && !!b.user && Array.isArray(b.companies)
}

/** The company a fresh session acts in: the default, else the only one, else none yet. */
function initialCompany(body: LoginBody): number | null {
  if (body.defaultCompanyId != null) return body.defaultCompanyId
  return body.companies.length === 1 ? body.companies[0].id : null
}

/** The OS's languages, for the server's texts before sign-in (Accept-Language). */
function acceptLanguage(): string {
  return app.getPreferredSystemLanguages().join(', ') || 'fr'
}

function endSession(): void {
  if (!session) return
  session = null
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(IPC.sessionEnded)
  }
}

/** A signed-in call. A 401 means the token is no longer valid: drop it and tell the renderer. */
async function authorized(request: ApiRequest): Promise<ApiResponse> {
  checkRequest(request)
  if (!session) {
    // Same answer the server would give, without a round trip.
    return {
      status: 401,
      requestId: '',
      etag: null,
      location: null,
      idempotentReplayed: false,
      body: { status: 401, title: 'Unauthorized', code: 'UNAUTHENTICATED' }
    }
  }
  const current = session
  const response = await send(request, {
    token: current.token,
    companyId: current.info.companyId
  })
  if (response.status === 401 && session === current) endSession()
  return response
}

async function login(userNo: string, password: string): Promise<SessionResult> {
  // A stale token gives 401 even on /auth/login, so it is sent without one.
  const response = await send(
    { method: 'POST', path: '/auth/login', body: { userNo, password } },
    { acceptLanguage: acceptLanguage() }
  )
  if (response.status !== 200 || !isLoginBody(response.body)) {
    return { response, session: null }
  }
  const body = response.body
  session = {
    token: body.token,
    info: {
      user: body.user,
      companies: body.companies,
      defaultCompanyId: body.defaultCompanyId,
      companyId: initialCompany(body),
      expiresAt: body.expiresAt
    }
  }
  // The token stays in this process.
  return { response: { ...response, body: null }, session: session.info }
}

async function logout(): Promise<void> {
  if (!session) return
  const current = session
  session = null
  // Best effort: the session is gone on this side whatever the server says.
  await send({ method: 'POST', path: '/auth/logout' }, { token: current.token }).catch(() => {})
}

function setCompany(companyId: number): SessionInfo {
  if (!session) throw new Error('Not signed in')
  if (!session.info.companies.some((c) => c.id === companyId)) {
    throw new Error(`Not one of the user's companies: ${companyId}`)
  }
  session.info = { ...session.info, companyId }
  return session.info
}

async function setLanguage(language: LanguageChoice): Promise<SessionResult> {
  const response = await authorized({ method: 'PATCH', path: '/auth/me', body: { language } })
  if (response.status === 200 && session) {
    session.info = { ...session.info, user: { ...session.info.user, language } }
  }
  return { response, session: session?.info ?? null }
}

/** Only our own renderer may use the bridge. */
function fromOurRenderer(event: IpcMainInvokeEvent, isTrusted: (url: string) => boolean): void {
  const url = event.senderFrame?.url ?? ''
  if (!isTrusted(url)) throw new Error(`IPC from an untrusted frame: ${url}`)
}

export function registerSessionIpc(isTrusted: (url: string) => boolean): void {
  const handle = <A extends unknown[], R>(
    channel: string,
    fn: (...args: A) => R | Promise<R>
  ): void => {
    ipcMain.handle(channel, (event, ...args) => {
      fromOurRenderer(event, isTrusted)
      return fn(...(args as A))
    })
  }

  handle(IPC.sessionGet, () => session?.info ?? null)
  handle(IPC.sessionLogin, (userNo: unknown, password: unknown) => {
    if (typeof userNo !== 'string' || typeof password !== 'string') {
      throw new Error('userNo and password must be strings')
    }
    return login(userNo, password)
  })
  handle(IPC.sessionLogout, () => logout())
  handle(IPC.sessionSetCompany, (companyId: unknown) => {
    if (typeof companyId !== 'number') throw new Error('companyId must be a number')
    return setCompany(companyId)
  })
  handle(IPC.sessionSetLanguage, (language: unknown) => {
    if (language !== 'fr' && language !== 'en' && language !== null) {
      throw new Error('language must be "fr", "en" or null')
    }
    return setLanguage(language)
  })
  handle(IPC.apiRequest, (request: unknown) => authorized(request as ApiRequest))

  // Local preferences belong to the signed-in user: none without a session.
  const userId = (): number => {
    if (!session) throw new Error('Not signed in')
    return session.info.user.id
  }
  handle(IPC.prefsRead, () => readLocalPreferences(userId()))
  handle(IPC.prefsWrite, (key: unknown, value: unknown) => {
    if (typeof key !== 'string') throw new Error('key must be a string')
    return writeLocalPreference(userId(), key, value)
  })
  handle(IPC.prefsClear, () => clearLocalPreferences(userId()))
}

/**
 * The language for the main process's own dialogs: the user's choice, else the
 * OS's. (A null choice means the company's default, which only /meta knows.)
 */
export function chromeLanguage(): 'fr' | 'en' {
  const choice = session?.info.user.language
  if (choice) return choice
  return app.getPreferredSystemLanguages()[0]?.startsWith('en') ? 'en' : 'fr'
}
