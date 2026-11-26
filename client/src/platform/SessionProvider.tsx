import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { LanguageChoice } from '../../../src/shared/bridge'
import { ApiError } from '../api/client'
import { forgetMeta } from '../api/meta'
import { queryClient } from './queryClient'
import { SessionContext, type SessionState } from './session'

/** Drops everything read for the previous user, company or language. */
function clearCaches(): void {
  queryClient.clear()
  forgetMeta()
}

/** Mirrors the main process's session; the token itself never comes here. */
export function SessionProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [state, setState] = useState<SessionState>({ status: 'loading' })

  useEffect(() => {
    let alive = true
    // The main process keeps the session across a renderer reload.
    window.stempy.session
      .get()
      .catch(() => null)
      .then((info) => {
        if (alive) setState(info ? { status: 'signedIn', info } : { status: 'signedOut' })
      })
    // Any 401: the main process has dropped the token; back to the sign-in form.
    const unsubscribe = window.stempy.session.onEnded(() => {
      clearCaches()
      setState({ status: 'signedOut' })
    })
    return () => {
      alive = false
      unsubscribe()
    }
  }, [])

  const login = useCallback(async (userNo: string, password: string) => {
    const { response, session } = await window.stempy.session.login(userNo, password)
    if (!session) return new ApiError(response)
    clearCaches()
    setState({ status: 'signedIn', info: session })
    return null
  }, [])

  const logout = useCallback(async () => {
    await window.stempy.session.logout()
    clearCaches()
    setState({ status: 'signedOut' })
  }, [])

  const setCompany = useCallback(async (companyId: number) => {
    const info = await window.stempy.session.setCompany(companyId)
    clearCaches()
    setState({ status: 'signedIn', info })
  }, [])

  const setLanguage = useCallback(async (language: LanguageChoice) => {
    const { response, session } = await window.stempy.session.setLanguage(language)
    if (response.status !== 200) throw new ApiError(response)
    // Every text the server sent is in the old language.
    clearCaches()
    if (session) setState({ status: 'signedIn', info: session })
  }, [])

  const api = useMemo(
    () => ({ state, login, logout, setCompany, setLanguage }),
    [state, login, logout, setCompany, setLanguage]
  )
  return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>
}
