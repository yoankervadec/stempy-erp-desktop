import { createContext, useCallback, useContext, useSyncExternalStore } from 'react'
import type { ApiResponse, PreferenceItems } from '../../../src/shared/bridge'
import { isPreferenceKey } from '../../../src/shared/bridge'

/**
 * The user's preferences: layouts, views, menu choices. Plain JSON by key, read
 * once at sign-in and written back a moment after each change.
 *
 * Kept by the server (docs/PREFERENCES_API.md) under the user, so they follow
 * the user from one machine to another. While the server has no such routes
 * (404), they are kept on this machine by the main process; once it has them,
 * the local ones are sent up once and dropped.
 *
 * Keys name what they hold: "shell.menuPinned", "list.product". A key whose
 * value depends on the company (filter values naming its records) ends with
 * "@<companyId>".
 */

/** Where the preferences are kept. "memory": the server failed; this session only. */
type Mode = 'server' | 'local' | 'memory'

const WRITE_DELAY_MS = 800
const PATH = '/auth/me/preferences'

function keyPath(key: string): string {
  return `${PATH}/${encodeURIComponent(key)}`
}

interface ServerItem {
  key: string
  value: unknown
}

function serverItems(body: unknown): PreferenceItems {
  const items = (body as { items?: ServerItem[] } | null)?.items
  const out: PreferenceItems = {}
  if (!Array.isArray(items)) return out
  for (const item of items) {
    if (item && isPreferenceKey(item.key)) out[item.key] = item.value
  }
  return out
}

function failed(response: ApiResponse): boolean {
  return response.status < 200 || response.status >= 300
}

export class PreferenceStore {
  private readonly items: Map<string, unknown>
  private readonly listeners = new Set<() => void>()
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>()

  constructor(
    readonly mode: Mode,
    items: PreferenceItems
  ) {
    this.items = new Map(Object.entries(items))
  }

  get(key: string): unknown {
    return this.items.get(key)
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Sets a key (undefined removes it): seen at once, written a moment later. */
  set(key: string, value: unknown): void {
    if (!isPreferenceKey(key)) throw new Error(`Not a preference key: ${key}`)
    if (value === undefined) this.items.delete(key)
    else this.items.set(key, value)
    for (const listener of this.listeners) listener()
    clearTimeout(this.timers.get(key))
    this.timers.set(
      key,
      setTimeout(() => void this.write(key), WRITE_DELAY_MS)
    )
  }

  /** Writes what is waiting, now: before signing out or the window going. */
  async flush(): Promise<void> {
    const keys = [...this.timers.keys()]
    for (const key of keys) clearTimeout(this.timers.get(key))
    await Promise.all(keys.map((key) => this.write(key)))
  }

  private async write(key: string): Promise<void> {
    this.timers.delete(key)
    const value = this.items.get(key)
    try {
      if (this.mode === 'local') {
        await window.stempy.localPreferences.write(key, value)
      } else if (this.mode === 'server') {
        const response = await window.stempy.api.request(
          value === undefined
            ? { method: 'DELETE', path: keyPath(key) }
            : { method: 'PUT', path: keyPath(key), body: { value } }
        )
        // A layout setting: not worth an error dialog. The next change tries again.
        if (failed(response) && response.status !== 404) {
          console.warn(`Preference ${key} not saved: HTTP ${response.status}`, response.body)
        }
      }
    } catch (e) {
      console.warn(`Preference ${key} not saved`, e)
    }
  }
}

/** Local preferences the server does not have yet go up once; then the local copy goes. */
async function sendLocalUp(onServer: PreferenceItems): Promise<PreferenceItems> {
  const local = await window.stempy.localPreferences.read()
  const missing = Object.entries(local).filter(([key]) => !(key in onServer))
  let allSent = true
  const merged = { ...onServer }
  for (const [key, value] of missing) {
    if (!isPreferenceKey(key)) continue
    const response = await window.stempy.api.request({
      method: 'PUT',
      path: keyPath(key),
      body: { value }
    })
    if (failed(response)) allSent = false
    else merged[key] = value
  }
  if (allSent && Object.keys(local).length > 0) await window.stempy.localPreferences.clear()
  return merged
}

async function load(): Promise<PreferenceStore> {
  const response = await window.stempy.api.request({ method: 'GET', path: PATH })
  if (response.status === 200) {
    return new PreferenceStore('server', await sendLocalUp(serverItems(response.body)))
  }
  if (response.status === 404) {
    return new PreferenceStore('local', await window.stempy.localPreferences.read())
  }
  // The server is there (the session is) but this failed: the defaults, for this session.
  console.warn(`Preferences not loaded: HTTP ${response.status}`, response.body)
  return new PreferenceStore('memory', {})
}

/** One store per signed-in user: a company switch keeps it, with its pending writes. */
let current: { userId: number; store: Promise<PreferenceStore> } | null = null

export function loadPreferences(userId: number): Promise<PreferenceStore> {
  if (current?.userId !== userId) {
    const store = load()
    current = { userId, store }
    // A failure is not kept: the next try loads again.
    store.catch(() => {
      if (current?.store === store) current = null
    })
  }
  return current.store
}

/** Signing out: write what is waiting, then forget the user's preferences. */
export async function closePreferences(): Promise<void> {
  const closing = current
  current = null
  await (await closing?.store.catch(() => null))?.flush()
}

// The window closing or reloading: a last try at what is waiting.
window.addEventListener('pagehide', () => {
  void current?.store.then((s) => s.flush())
})

export const PreferencesContext = createContext<PreferenceStore | null>(null)

/**
 * One preference: its value (the fallback when unset or not of the expected
 * shape, as a value from another version of the client may be) and a setter.
 * Setting undefined puts the fallback back. The fallback should be a constant.
 */
export function usePreference<T>(
  key: string,
  fallback: T,
  valid: (value: unknown) => value is T
): [T, (next: T | undefined | ((previous: T) => T | undefined)) => void] {
  const store = useContext(PreferencesContext)
  if (!store) throw new Error('usePreference outside PreferencesContext')
  const raw = useSyncExternalStore(store.subscribe, () => store.get(key))
  const value = raw !== undefined && valid(raw) ? raw : fallback
  const set = useCallback(
    (next: T | undefined | ((previous: T) => T | undefined)) => {
      const was = store.get(key)
      const previous = was !== undefined && valid(was) ? was : fallback
      store.set(key, typeof next === 'function' ? (next as (p: T) => T)(previous) : next)
    },
    [store, key, fallback, valid]
  )
  return [value, set]
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}
