import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router'
import { HomePage } from './screens/HomePage'
import { RecordPage } from './screens/RecordPage'
import { ReportPage } from './screens/ReportPage'
import { ResourcePage } from './screens/ResourcePage'
import { ScreenPage } from './screens/ScreenPage'
import { AppLayout } from './shell/AppLayout'

/**
 * The signed-in screens. Sign-in, the company choice and loading /meta happen
 * before the router is mounted (App.tsx), so every route can rely on /meta.
 */
const rootRoute = createRootRoute({ component: AppLayout })

const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage })

const resourceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/r/$resourceKey',
  component: ResourcePage
})

/** "new", or a stored record's id. */
const recordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/r/$resourceKey/$recordId',
  component: RecordPage
})

const reportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports/$reportKey',
  component: ReportPage
})

/** A screen of /meta.screens, built by the client (overrides/registry.ts). */
const screenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/s/$screenKey',
  component: ScreenPage
})

const routeTree = rootRoute.addChildren([
  homeRoute,
  resourceRoute,
  recordRoute,
  reportRoute,
  screenRoute
])

// Hash history: the renderer is one file (app://stempy/index.html), with no server-side routing.
export const router = createRouter({ routeTree, history: createHashHistory() })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
