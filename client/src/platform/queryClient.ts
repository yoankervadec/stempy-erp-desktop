import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A desktop app: data is refreshed by the user's actions, not by focus changes.
      refetchOnWindowFocus: false,
      // Retry only what may pass on a second try: unreachable server, busy database.
      retry: (failureCount, error) =>
        failureCount < 2 &&
        error instanceof ApiError &&
        (error.status === 0 || error.code === 'DATABASE_BUSY')
    },
    mutations: { retry: false }
  }
})
