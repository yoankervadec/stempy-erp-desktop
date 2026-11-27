import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import { isPreferenceKey, MAX_PREFERENCE_BYTES, type PreferenceItems } from '../shared/bridge'
import { SERVER_URL } from './config'

/**
 * The user's preferences on this machine, for a server that does not store them
 * yet (GET /auth/me/preferences answers 404). One JSON file per server and user,
 * in the app's data folder. Layout settings only: nothing secret goes here.
 */

interface LocalFile {
  serverUrl: string
  userId: number
  items: PreferenceItems
}

function fileFor(userId: number): string {
  const name = createHash('sha256').update(`${SERVER_URL}|${userId}`).digest('hex').slice(0, 24)
  // Not "preferences": Chromium has a "Preferences" file there, and macOS ignores case.
  return join(app.getPath('userData'), 'user-preferences', `${name}.json`)
}

async function read(userId: number): Promise<PreferenceItems> {
  try {
    const file = JSON.parse(await readFile(fileFor(userId), 'utf8')) as LocalFile
    return file && typeof file.items === 'object' && file.items !== null ? file.items : {}
  } catch {
    return {}
  }
}

// Writes are chained, so two quick changes never interleave on disk.
let queue: Promise<unknown> = Promise.resolve()

function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn)
  queue = next.catch(() => {})
  return next
}

async function save(userId: number, items: PreferenceItems): Promise<void> {
  const path = fileFor(userId)
  await mkdir(join(path, '..'), { recursive: true })
  const body: LocalFile = { serverUrl: SERVER_URL, userId, items }
  // Written aside, then renamed: a crash never leaves half a file.
  await writeFile(`${path}.tmp`, JSON.stringify(body), 'utf8')
  await rename(`${path}.tmp`, path)
}

export function readLocalPreferences(userId: number): Promise<PreferenceItems> {
  return serialized(() => read(userId))
}

/** Sets one key; undefined removes it. */
export function writeLocalPreference(userId: number, key: string, value: unknown): Promise<void> {
  if (!isPreferenceKey(key)) throw new Error(`Not a preference key: ${key}`)
  if (value !== undefined && JSON.stringify(value).length > MAX_PREFERENCE_BYTES) {
    throw new Error(`Preference ${key} is over ${MAX_PREFERENCE_BYTES} bytes`)
  }
  return serialized(async () => {
    const items = await read(userId)
    if (value === undefined) delete items[key]
    else items[key] = value
    await save(userId, items)
  })
}

/** Once the server stores them: the local copy has been sent up and goes. */
export function clearLocalPreferences(userId: number): Promise<void> {
  return serialized(() => rm(fileFor(userId), { force: true }))
}
