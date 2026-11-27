import { createContext, useContext, useEffect, useRef } from 'react'

/** One thing the command bar can run: a page action, a page to open, an app command. */
export interface Command {
  id: string
  label: string
  /** Shown after the label, dimmed: the module of a page, for instance. */
  hint?: string
  /** The key that runs it, in Mantine's notation ("mod+n", "shift+f3"). */
  hotkey?: string
  disabled?: boolean
  run: () => void
}

/** Where a set of commands comes from. A modal's commands cover its page's. */
export type CommandLevel = 'page' | 'modal'

interface Layer {
  id: number
  level: CommandLevel
  commands: Command[]
}

/**
 * The commands of what is on screen, kept outside React state: the command bar
 * reads them when it opens, so a page re-rendering never re-renders the shell.
 */
export class CommandStore {
  private layers: Layer[] = []
  private nextId = 0

  add(level: CommandLevel): number {
    const id = ++this.nextId
    this.layers.push({ id, level, commands: [] })
    return id
  }

  set(id: number, commands: Command[]): void {
    const layer = this.layers.find((l) => l.id === id)
    if (layer) layer.commands = commands
  }

  remove(id: number): void {
    this.layers = this.layers.filter((l) => l.id !== id)
  }

  /** The commands of the front-most layer: the open modal's, else the page's. */
  current(): Command[] {
    const modal = this.layers.filter((l) => l.level === 'modal')
    const front = modal.length > 0 ? modal : this.layers
    return front[front.length - 1]?.commands ?? []
  }
}

export const CommandContext = createContext<CommandStore | null>(null)

/** Offers these commands in the command bar while the calling component is mounted. */
export function useCommandLayer(commands: Command[], level: CommandLevel = 'page'): void {
  const store = useContext(CommandContext)
  const id = useRef<number | null>(null)
  useEffect(() => {
    if (!store) return
    const layer = store.add(level)
    id.current = layer
    return () => {
      store.remove(layer)
      id.current = null
    }
  }, [store, level])
  // Every render: the commands close over the page's latest state.
  useEffect(() => {
    if (store && id.current != null) store.set(id.current, commands)
  })
}
