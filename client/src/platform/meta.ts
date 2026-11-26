import { createContext, useContext } from 'react'
import type { Language, Meta, MetaReport, MetaResource } from '../api/types'
import { systemLanguage } from './i18n'

/**
 * The /meta of the signed-in user in the current company. The app shell
 * provides it once loaded, so every screen below it reads it synchronously.
 */
export const MetaContext = createContext<Meta | null>(null)

export function useMeta(): Meta {
  const meta = useContext(MetaContext)
  if (!meta) throw new Error('useMeta outside a loaded MetaContext')
  return meta
}

/** The language of the client's own texts: the server's once /meta is in, else the OS's. */
export function useLanguage(): Language {
  return useContext(MetaContext)?.language ?? systemLanguage()
}

/** A resource by key, or undefined when the user cannot see it. */
export function useResource(key: string): MetaResource | undefined {
  return useMeta().resources.find((r) => r.key === key)
}

export function useReport(key: string): MetaReport | undefined {
  return useMeta().reports.find((r) => r.key === key)
}
