import { createContext, useContext } from 'react'
import type { LanguageChoice, SessionInfo } from '../../../src/shared/bridge'
import type { ApiError } from '../api/client'

export type SessionState =
  { status: 'loading' } | { status: 'signedOut' } | { status: 'signedIn'; info: SessionInfo }

export interface SessionApi {
  state: SessionState
  /** Resolves with the error to show, or null when signed in. */
  login(userNo: string, password: string): Promise<ApiError | null>
  logout(): Promise<void>
  setCompany(companyId: number): Promise<void>
  /** Throws the ApiError when the server refuses. */
  setLanguage(language: LanguageChoice): Promise<void>
}

/** Provided by SessionProvider. */
export const SessionContext = createContext<SessionApi | null>(null)

export function useSession(): SessionApi {
  const api = useContext(SessionContext)
  if (!api) throw new Error('useSession outside SessionProvider')
  return api
}

/** For screens that only show when signed in. */
export function useSessionInfo(): SessionInfo {
  const { state } = useSession()
  if (state.status !== 'signedIn') throw new Error('useSessionInfo while signed out')
  return state.info
}
