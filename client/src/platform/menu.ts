import { useNavigate } from '@tanstack/react-router'
import { createContext, useContext } from 'react'
import type { ModuleName } from '../api/types'
import { useMeta } from './meta'
import { usePreference } from './preferences'

/**
 * The menu as the user arranged it: modules in their order, pages and modules
 * hidden, favourite pages. Kept as the preference "menu". /meta.menu still
 * decides what there is: a page the server no longer offers is gone whatever
 * was saved, and a new one shows.
 */
export interface MenuChoices {
  /** Page ids ("r:<resourceKey>", "report:<reportKey>") and module ids ("m:<module>"). */
  hidden?: string[]
  /** Module names, in the user's order; the others follow in the server's. */
  order?: string[]
  /** Page ids, in the user's order. */
  favourites?: string[]
}

export interface MenuPage {
  id: string
  label: string
  /** The module's label. */
  module: string
  hidden: boolean
  favourite: boolean
  go: () => void
}

export interface MenuModule {
  module: ModuleName
  id: string
  label: string
  hidden: boolean
  pages: MenuPage[]
}

const NONE: MenuChoices = {}

function isChoices(value: unknown): value is MenuChoices {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

export const resourcePageId = (key: string): string => `r:${key}`
export const reportPageId = (key: string): string => `report:${key}`

export interface PersonalMenu {
  /** Every module and page, in the user's order, hidden ones included (to arrange them). */
  all: MenuModule[]
  /** What the menu bar shows. */
  shown: MenuModule[]
  favourites: MenuPage[]
  /** Any page by id, if /meta offers it. */
  page: (id: string) => MenuPage | undefined
  isFavourite: (id: string) => boolean
  toggleFavourite: (id: string) => void
  /** Moves a favourite up or down. */
  moveFavourite: (id: string, step: -1 | 1) => void
  toggleHidden: (id: string) => void
  moveModule: (module: string, step: -1 | 1) => void
  /** Module order and hidden entries back to the server's; favourites stay. */
  reset: () => void
}

function moved(list: string[], id: string, step: -1 | 1): string[] {
  const i = list.indexOf(id)
  const j = i + step
  if (i < 0 || j < 0 || j >= list.length) return list
  const out = [...list]
  ;[out[i], out[j]] = [out[j], out[i]]
  return out
}

export function usePersonalMenu(): PersonalMenu {
  const meta = useMeta()
  const navigate = useNavigate()
  const [choices, setChoices] = usePreference('menu', NONE, isChoices)
  const hidden = new Set(strings(choices.hidden))
  const favouriteIds = strings(choices.favourites)
  const label = (key: string, list: { key: string; label: string }[]): string =>
    list.find((x) => x.key === key)?.label ?? key

  // The user's module order first, then the server's for the rest.
  const savedOrder = strings(choices.order)
  const groups = [...meta.menu].sort((a, b) => {
    const ia = savedOrder.indexOf(a.module)
    const ib = savedOrder.indexOf(b.module)
    if (ia < 0 && ib < 0) return 0
    if (ia < 0) return 1
    if (ib < 0) return -1
    return ia - ib
  })

  const all: MenuModule[] = groups.map((g) => {
    const page = (id: string, text: string, go: () => void): MenuPage => ({
      id,
      label: text,
      module: g.label,
      hidden: hidden.has(id),
      favourite: favouriteIds.includes(id),
      go
    })
    return {
      module: g.module,
      id: `m:${g.module}`,
      label: g.label,
      hidden: hidden.has(`m:${g.module}`),
      pages: [
        ...g.resources.map((key) =>
          page(
            resourcePageId(key),
            label(key, meta.resources),
            () => void navigate({ to: '/r/$resourceKey', params: { resourceKey: key } })
          )
        ),
        ...g.reports.map((key) =>
          page(
            reportPageId(key),
            label(key, meta.reports),
            () => void navigate({ to: '/reports/$reportKey', params: { reportKey: key } })
          )
        )
      ]
    }
  })
  const byId = new Map(all.flatMap((m) => m.pages).map((p) => [p.id, p]))
  const shown = all
    .filter((m) => !m.hidden)
    .map((m) => ({ ...m, pages: m.pages.filter((p) => !p.hidden) }))
    .filter((m) => m.pages.length > 0)
  const favourites = favouriteIds.map((id) => byId.get(id)).filter((p): p is MenuPage => !!p)

  const update = (fn: (c: MenuChoices) => MenuChoices): void => setChoices((c) => fn(c))
  const toggle = (list: string[], id: string): string[] =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id]

  return {
    all,
    shown,
    favourites,
    page: (id) => byId.get(id),
    isFavourite: (id) => favouriteIds.includes(id),
    // Ids the server no longer offers are dropped on each change.
    toggleFavourite: (id) =>
      update((c) => ({
        ...c,
        favourites: toggle(strings(c.favourites), id).filter((x) => byId.has(x))
      })),
    moveFavourite: (id, step) =>
      update((c) => ({
        ...c,
        favourites: moved(
          strings(c.favourites).filter((x) => byId.has(x)),
          id,
          step
        )
      })),
    toggleHidden: (id) => update((c) => ({ ...c, hidden: toggle(strings(c.hidden), id) })),
    moveModule: (module, step) =>
      update((c) => ({
        ...c,
        order: moved(
          all.map((m) => m.module),
          module,
          step
        )
      })),
    // Order and hidden entries back to the server's; the favourites stay.
    reset: () => update((c) => (c.favourites ? { favourites: c.favourites } : {}))
  }
}

/** Opens the "Customize menu" dialog; provided by the app layout. */
export const CustomizeMenuContext = createContext<() => void>(() => {})

export function useOpenCustomizeMenu(): () => void {
  return useContext(CustomizeMenuContext)
}
