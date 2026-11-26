/**
 * Where the server is. Set MAIN_VITE_SERVER_URL in .env (see .env.example) to change it.
 */
export const SERVER_URL: string = (
  import.meta.env.MAIN_VITE_SERVER_URL || 'http://localhost:8080'
).replace(/\/+$/, '')

/** A request that takes longer is abandoned and reported as unreachable. */
export const REQUEST_TIMEOUT_MS = 30_000
