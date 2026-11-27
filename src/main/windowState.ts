import { readFileSync, writeFileSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import { app, screen, type BrowserWindow, type Rectangle } from 'electron'

/**
 * The window opens as it was left: size, position, maximized, full screen. This
 * belongs to the machine (its screens), not to the user, so it is kept here and
 * not with the user's preferences on the server.
 */

interface WindowState {
  /** The window's normal bounds, as it is when neither maximized nor full screen. */
  bounds: Rectangle
  maximized: boolean
  fullScreen: boolean
}

const DEFAULT_SIZE = { width: 1280, height: 800 }
const SAVE_DELAY_MS = 500

function file(): string {
  return join(app.getPath('userData'), 'window-state.json')
}

function isRect(r: unknown): r is Rectangle {
  const x = r as Rectangle | null
  return !!x && [x.x, x.y, x.width, x.height].every((n) => Number.isFinite(n))
}

function load(): WindowState | null {
  try {
    const s = JSON.parse(readFileSync(file(), 'utf8')) as WindowState
    return isRect(s.bounds) ? { ...s, maximized: !!s.maximized, fullScreen: !!s.fullScreen } : null
  } catch {
    return null
  }
}

/** Saved bounds only if most of the title bar is still on a screen: a monitor may be gone. */
function onScreen(b: Rectangle): boolean {
  const titleBar = { x: b.x, y: b.y, width: b.width, height: 40 }
  return screen.getAllDisplays().some(({ workArea: w }) => {
    const width = Math.min(titleBar.x + titleBar.width, w.x + w.width) - Math.max(titleBar.x, w.x)
    const height =
      Math.min(titleBar.y + titleBar.height, w.y + w.height) - Math.max(titleBar.y, w.y)
    return width >= Math.min(200, b.width / 2) && height > 0
  })
}

/** The options to create the window with, from the last saved state. */
export function initialWindowBounds(): Partial<Rectangle> {
  const state = load()
  if (!state) return DEFAULT_SIZE
  const { width, height } = state.bounds
  return onScreen(state.bounds) ? state.bounds : { width, height }
}

/** Puts the window back in maximized or full screen, then keeps the state saved. */
export function trackWindowState(window: BrowserWindow): void {
  const state = load()
  // Maximized before it shows (no flash at the normal size); full screen once
  // shown, since macOS animates a visible window into its own space.
  window.once('ready-to-show', () => {
    if (state?.maximized) window.maximize()
    if (state?.fullScreen) setImmediate(() => window.setFullScreen(true))
  })

  const save = (): void => {
    if (window.isDestroyed()) return
    const next: WindowState = {
      bounds: window.getNormalBounds(),
      maximized: window.isMaximized(),
      fullScreen: window.isFullScreen()
    }
    try {
      writeFileSync(`${file()}.tmp`, JSON.stringify(next), 'utf8')
      renameSync(`${file()}.tmp`, file())
    } catch {
      // Not worth bothering the user: the next change saves again.
    }
  }
  let timer: NodeJS.Timeout | undefined
  const later = (): void => {
    clearTimeout(timer)
    timer = setTimeout(save, SAVE_DELAY_MS)
  }
  for (const event of [
    'resize',
    'move',
    'maximize',
    'unmaximize',
    'enter-full-screen',
    'leave-full-screen'
  ] as const) {
    window.on(event as 'resize', later)
  }
  // Closing: saved at once, while the window still has its bounds.
  window.on('close', () => {
    clearTimeout(timer)
    save()
  })
}
