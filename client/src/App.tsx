import { useQuery } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { useEffect } from 'react'
import { fetchMeta } from './api/meta'
import { SUPPORTED_API_VERSION } from './api/types'
import { MetaContext } from './platform/meta'
import { loadPreferences, PreferencesContext } from './platform/preferences'
import { useSession, useSessionInfo } from './platform/session'
import { router } from './router'
import { CompanyPicker } from './shell/CompanyPicker'
import { ErrorAlert } from './shell/ErrorAlert'
import { LoginPage } from './shell/LoginPage'
import { Splash } from './shell/Splash'
import { UpdateRequired } from './shell/UpdateRequired'

/** Signed in, in a company: load /meta, then the screens. */
function SignedIn(): React.JSX.Element {
  const info = useSessionInfo()
  // Fetched at sign-in, on a company switch and on a language change (the session
  // clears the cache on each), never per screen.
  const meta = useQuery({
    queryKey: ['meta', info.companyId, info.user.language],
    queryFn: fetchMeta,
    staleTime: Infinity,
    gcTime: Infinity
  })
  // The user's own: read once per sign-in, kept across company switches.
  const preferences = useQuery({
    queryKey: ['preferences', info.user.id],
    queryFn: () => loadPreferences(info.user.id),
    staleTime: Infinity,
    gcTime: Infinity
  })

  const failed = meta.isError ? meta : preferences.isError ? preferences : null
  if (failed) {
    return (
      <Splash>
        <ErrorAlert error={failed.error} onRetry={() => failed.refetch()} />
      </Splash>
    )
  }
  if (!meta.data || !preferences.data) return <Splash />
  if (meta.data.apiVersion > SUPPORTED_API_VERSION) {
    return <UpdateRequired serverVersion={meta.data.apiVersion} />
  }
  return (
    <MetaContext.Provider value={meta.data}>
      <PreferencesContext.Provider value={preferences.data}>
        <RouterProvider router={router} />
      </PreferencesContext.Provider>
    </MetaContext.Provider>
  )
}

export default function App(): React.JSX.Element {
  const { state } = useSession()

  // A new sign-in starts on the home screen, not where the last session was.
  useEffect(() => {
    if (state.status === 'signedOut') router.history.replace('/')
  }, [state.status])

  if (state.status === 'loading') return <Splash />
  if (state.status === 'signedOut') return <LoginPage />
  if (state.info.companyId == null) return <CompanyPicker />
  return <SignedIn />
}
