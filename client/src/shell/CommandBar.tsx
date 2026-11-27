import { Kbd, Modal, Text, UnstyledButton } from '@mantine/core'
import { useHotkeys } from '@mantine/hooks'
import { Fragment, useContext, useEffect, useRef, useState } from 'react'
import {
  CommandContext,
  useCommandLayer,
  type Command,
  type CommandLevel
} from '../platform/commands'
import { usePersonalMenu } from '../platform/menu'
import { formatHotkey, isEditable, isHotkey } from '../platform/hotkeys'
import { useText } from '../platform/useText'
import classes from './CommandBar.module.css'
import type { ActionGroups } from './Page'

/** Offers a page's (or a modal's) action bar in the command bar. Renders nothing. */
export function CommandLayer({
  actions,
  extra = [],
  level = 'page'
}: {
  actions: ActionGroups
  extra?: Command[]
  level?: CommandLevel
}): null {
  const commands: Command[] = [
    ...actions.flat().map((a) => ({
      id: a.key,
      label: a.label,
      hotkey: a.hotkey,
      disabled: a.disabled || a.loading,
      run: a.onClick
    })),
    ...extra
  ]
  useCommandLayer(commands, level)
  return null
}

interface Section {
  title: string
  commands: Command[]
}

/** Lower case, accents dropped: "Écriture" matches "ecri". */
function fold(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

function matches(c: Command, terms: string[]): boolean {
  const text = fold(`${c.label} ${c.hint ?? ''}`)
  return terms.every((t) => text.includes(t))
}

/** Pages whose label starts with what was typed come first. */
function rank(commands: Command[], terms: string[]): Command[] {
  if (terms.length === 0) return commands
  const first = terms[0]
  return [...commands].sort(
    (a, b) => Number(!fold(a.label).startsWith(first)) - Number(!fold(b.label).startsWith(first))
  )
}

/**
 * Every page /meta.menu offers, the module as its hint; favourites first.
 * Pages hidden from the menu bar stay here: hiding tidies the menu only.
 */
function usePageCommands(): Command[] {
  const t = useText()
  const menu = usePersonalMenu()
  const favourites = new Set(menu.favourites.map((p) => p.id))
  return [
    ...menu.favourites.map((p) => ({
      id: `page:${p.id}`,
      label: p.label,
      hint: `${t('favourite')} - ${p.module}`,
      run: p.go
    })),
    ...menu.all
      .flatMap((m) => m.pages)
      .filter((p) => !favourites.has(p.id))
      .map((p) => ({ id: `page:${p.id}`, label: p.label, hint: p.module, run: p.go }))
  ]
}

function Palette({
  sections,
  onClose
}: {
  sections: Section[]
  onClose: () => void
}): React.JSX.Element {
  const t = useText()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const list = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  // A menu that just closed hands the focus back to its button a moment later,
  // after this opened: keys landing outside the input still belong to the bar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.target === input.current) return
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
        return
      }
      // Focused before the key's default action: a typed letter lands in the input.
      input.current?.focus()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  const terms = fold(query).split(/\s+/).filter(Boolean)
  const shown = sections
    .map((s) => ({
      ...s,
      commands: rank(
        s.commands.filter((c) => matches(c, terms)),
        terms
      )
    }))
    .filter((s) => s.commands.length > 0)
  const flat = shown.flatMap((s) => s.commands)
  const current = Math.min(active, Math.max(0, flat.length - 1))

  useEffect(() => {
    list.current?.querySelector(`[data-index="${current}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [current])

  const run = (c: Command | undefined): void => {
    if (!c || c.disabled) return
    onClose()
    c.run()
  }

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((current + 1) % Math.max(1, flat.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((current - 1 + flat.length) % Math.max(1, flat.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      run(flat[current])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  let index = 0
  return (
    <>
      <input
        ref={input}
        className={classes.input}
        autoFocus
        // Escape here closes the bar only: Mantine's modals ignore keys from this input,
        // so a record modal open under the bar stays open.
        data-mantine-stop-propagation="true"
        placeholder={t('commandBarPlaceholder')}
        aria-label={t('commandBarPlaceholder')}
        value={query}
        onChange={(e) => {
          setQuery(e.currentTarget.value)
          setActive(0)
        }}
        onKeyDown={onKeyDown}
      />
      <div className={classes.list} ref={list} role="listbox">
        {flat.length === 0 && (
          <Text size="sm" c="dimmed" p="sm">
            {t('nothingMatches')}
          </Text>
        )}
        {shown.map((s) => (
          <Fragment key={s.title}>
            <div className={classes.section}>{s.title}</div>
            {s.commands.map((c) => {
              const i = index++
              return (
                <div
                  key={c.id}
                  role="option"
                  aria-selected={i === current}
                  aria-disabled={c.disabled || undefined}
                  data-index={i}
                  className={classes.item}
                  onMouseMove={() => i !== current && setActive(i)}
                  onClick={() => run(c)}
                >
                  <span className={classes.label}>
                    {c.label}
                    {c.hint && <span className={classes.hint}>{c.hint}</span>}
                  </span>
                  {c.hotkey && <Kbd size="xs">{formatHotkey(c.hotkey)}</Kbd>}
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>
    </>
  )
}

/**
 * The command bar, as in VS Code or Business Central's "Tell me": Alt+Q or
 * Ctrl+K, then type. It lists the front-most page's commands, every page, and
 * the application's own commands.
 */
export function CommandBar({ appCommands }: { appCommands: Command[] }): React.JSX.Element {
  const t = useText()
  const store = useContext(CommandContext)
  const pages = usePageCommands()
  const [sections, setSections] = useState<Section[] | null>(null)

  const open = (): void => {
    if (sections) return
    setSections([
      { title: t('commandsThisPage'), commands: store?.current() ?? [] },
      { title: t('commandsGoTo'), commands: pages },
      { title: t('commandsApp'), commands: appCommands }
    ])
  }

  // The front-most layer's shortcuts, from anywhere (inside inputs too: they all carry a
  // modifier or are function keys). Not while the bar itself is open.
  useEffect(() => {
    if (!store || sections) return
    const onKey = (e: KeyboardEvent): void => {
      const c = store.current().find(
        (x) =>
          x.hotkey &&
          // Cmd+Backspace deletes text in a field: never a record from there.
          !(x.hotkey.includes('backspace') && isEditable(e.target)) &&
          isHotkey(e, x.hotkey)
      )
      if (!c) return
      e.preventDefault()
      if (!c.disabled) c.run()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [store, sections])

  // Inside inputs too: the bar is reachable from anywhere.
  useHotkeys(
    [
      ['alt+q', open, { usePhysicalKeys: true }],
      ['mod+k', open]
    ],
    []
  )

  return (
    <>
      <UnstyledButton className={classes.trigger} onClick={open}>
        <span>{t('commandBarPlaceholder')}</span>
        <Kbd size="xs" className={classes.triggerKey}>
          {formatHotkey('alt+q')}
        </Kbd>
      </UnstyledButton>
      <Modal
        opened={sections !== null}
        onClose={() => setSections(null)}
        withCloseButton={false}
        padding={0}
        size={560}
        yOffset={48}
        // A command may open its own dialog: focus must not jump back to the trigger.
        returnFocus={false}
        closeOnEscape={false}
        // Above any record modal or dialog the command is about.
        zIndex={400}
        aria-label={t('commandBarPlaceholder')}
      >
        {sections && <Palette sections={sections} onClose={() => setSections(null)} />}
      </Modal>
    </>
  )
}
