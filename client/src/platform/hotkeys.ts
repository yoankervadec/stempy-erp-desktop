import { getHotkeyHandler } from '@mantine/hooks'

/** macOS: "mod" is Cmd and Alt is Option. */
export const isMac = /Mac/.test(navigator.userAgent)

const NAMES: Record<string, string> = {
  mod: isMac ? 'Cmd' : 'Ctrl',
  ctrl: 'Ctrl',
  meta: isMac ? 'Cmd' : 'Meta',
  alt: isMac ? 'Option' : 'Alt',
  shift: 'Shift',
  delete: 'Delete',
  backspace: 'Backspace',
  enter: 'Enter',
  escape: 'Esc'
}

/** Delete a record: Ctrl+Delete as in NAV; a Mac keyboard's Delete key is Backspace. */
export const DELETE_HOTKEY = isMac ? 'mod+backspace' : 'mod+delete'

/** Typing in a field: keys that edit text there must keep doing so. */
export function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

/** A Mantine hotkey ("mod+n", "shift+f3") as the user reads it ("Ctrl+N", "Shift+F3"). */
export function formatHotkey(hotkey: string): string {
  return hotkey
    .split('+')
    .map((part) => NAMES[part] ?? part.toUpperCase())
    .join('+')
}

/**
 * Whether the event is this hotkey. Physical keys: Option+Q on a Mac types "œ",
 * and a French layout must not move the shortcuts.
 */
export function isHotkey(event: KeyboardEvent, hotkey: string): boolean {
  let hit = false
  getHotkeyHandler([
    [hotkey, () => (hit = true), { usePhysicalKeys: true, preventDefault: false }]
  ])(event)
  return hit
}
