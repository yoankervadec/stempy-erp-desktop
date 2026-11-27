import { app, dialog, shell, BrowserWindow, net, protocol } from 'electron'
import { join, normalize, relative, isAbsolute } from 'path'
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { chromeLanguage, registerSessionIpc } from './session'
import { initialWindowBounds, trackWindowState } from './windowState'

/** Production: the renderer is served from app://stempy, a stable origin with a strict CSP. */
const APP_SCHEME = 'app'
const APP_ORIGIN = `${APP_SCHEME}://stempy`
const RENDERER_DIR = join(__dirname, '../renderer')

/** Development: electron-vite's dev server. */
const DEV_URL = is.dev ? process.env['ELECTRON_RENDERER_URL'] : undefined

/** Protocol and host, not URL.origin: Node gives "null" as the origin of a custom scheme. */
function site(url: string): string {
  const u = new URL(url)
  return `${u.protocol}//${u.host}`
}

const RENDERER_SITE = site(DEV_URL ?? APP_ORIGIN)

function isTrustedUrl(url: string): boolean {
  try {
    return site(url) === RENDERER_SITE
  } catch {
    return false
  }
}

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // Mantine writes inline styles.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  // The renderer talks to the server only through the main process.
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'"
].join('; ')

protocol.registerSchemesAsPrivileged([
  { scheme: APP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }
])

function serveRenderer(): void {
  protocol.handle(APP_SCHEME, async (request) => {
    const url = new URL(request.url)
    if (url.host !== 'stempy') return new Response('Not found', { status: 404 })
    const file = normalize(join(RENDERER_DIR, decodeURIComponent(url.pathname)))
    const rel = relative(RENDERER_DIR, file)
    if (rel.startsWith('..') || isAbsolute(rel)) return new Response('Not found', { status: 404 })
    const response = await net.fetch(pathToFileURL(file).toString())
    const headers = new Headers(response.headers)
    if (file.endsWith('.html')) headers.set('Content-Security-Policy', CSP)
    return new Response(response.body, { status: response.status, headers })
  })
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    ...initialWindowBounds(),
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'Stempy ERP',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false
    }
  })

  trackWindowState(mainWindow)
  mainWindow.on('ready-to-show', () => mainWindow.show())

  // Links to the outside open in the system browser; nothing opens inside the app.
  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (/^https?:\/\//.test(details.url)) shell.openExternal(details.url)
    return { action: 'deny' }
  })
  // The renderer refuses to unload while there are unsaved changes (its route
  // blockers). Electron would then silently refuse to close or quit: ask instead.
  mainWindow.webContents.on('will-prevent-unload', (event) => {
    const fr = chromeLanguage() === 'fr'
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'question',
      buttons: fr ? ['Quitter', 'Rester'] : ['Leave', 'Stay'],
      defaultId: 1,
      cancelId: 1,
      message: fr ? 'Des modifications ne sont pas enregistrées.' : 'There are unsaved changes.',
      detail: fr ? 'Quitter sans les enregistrer?' : 'Leave without saving them?'
    })
    if (choice === 0) event.preventDefault()
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isTrustedUrl(url)) event.preventDefault()
  })

  if (DEV_URL) {
    mainWindow.loadURL(DEV_URL)
  } else {
    mainWindow.loadURL(`${APP_ORIGIN}/index.html`)
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  // F12 opens DevTools in development; Cmd/Ctrl+R is ignored in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // No permission requests (camera, notifications...) are granted.
  app.on('web-contents-created', (_, contents) => {
    contents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
  })

  if (!DEV_URL) serveRenderer()
  registerSessionIpc(isTrustedUrl)
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
