import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router'
import { HomePage } from './screens/HomePage'
import { ReportPage } from './screens/ReportPage'
import { ResourcePage } from './screens/ResourcePage'
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

const reportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports/$reportKey',
  component: ReportPage
})

const routeTree = rootRoute.addChildren([homeRoute, resourceRoute, reportRoute])

// Hash history: the renderer is one file (app://stempy/index.html), with no server-side routing.
export const router = createRouter({ routeTree, history: createHashHistory() })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
