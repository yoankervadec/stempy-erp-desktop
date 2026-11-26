import { useQuery } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { useEffect } from 'react'
import { fetchMeta } from './api/meta'
import { SUPPORTED_API_VERSION } from './api/types'
import { MetaContext } from './platform/meta'
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

  if (meta.isError) {
    return (
      <Splash>
        <ErrorAlert error={meta.error} onRetry={() => meta.refetch()} />
      </Splash>
    )
  }
  if (!meta.data) return <Splash />
  if (meta.data.apiVersion > SUPPORTED_API_VERSION) {
    return <UpdateRequired serverVersion={meta.data.apiVersion} />
  }
  return (
    <MetaContext.Provider value={meta.data}>
      <RouterProvider router={router} />
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
