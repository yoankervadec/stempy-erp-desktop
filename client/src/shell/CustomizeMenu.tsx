import { ActionIcon, Button, Checkbox, Group, Modal, ScrollArea, Stack, Text } from '@mantine/core'
import { usePersonalMenu } from '../platform/menu'
import { useText } from '../platform/useText'
import { CommandLayer } from './CommandBar'
import classes from './CustomizeMenu.module.css'

function Arrow({ dir }: { dir: 'up' | 'down' }): React.JSX.Element {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
      <path
        d={dir === 'up' ? 'M1 7 L5 3 L9 7' : 'M1 3 L5 7 L9 3'}
        stroke="currentColor"
        fill="none"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function MoveButtons({
  label,
  first,
  last,
  onMove
}: {
  label: string
  first: boolean
  last: boolean
  onMove: (step: -1 | 1) => void
}): React.JSX.Element {
  const t = useText()
  return (
    <Group gap={2} wrap="nowrap">
      <ActionIcon
        variant="subtle"
        color="gray"
        size="sm"
        disabled={first}
        onClick={() => onMove(-1)}
        aria-label={`${t('moveUp')}: ${label}`}
        title={t('moveUp')}
      >
        <Arrow dir="up" />
      </ActionIcon>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="sm"
        disabled={last}
        onClick={() => onMove(1)}
        aria-label={`${t('moveDown')}: ${label}`}
        title={t('moveDown')}
      >
        <Arrow dir="down" />
      </ActionIcon>
    </Group>
  )
}

/**
 * Which modules and pages the menu bar shows, the modules' order, and the
 * favourites' order. Changes apply at once; /meta still decides what exists.
 */
export function CustomizeMenu({
  opened,
  onClose
}: {
  opened: boolean
  onClose: () => void
}): React.JSX.Element {
  const t = useText()
  const menu = usePersonalMenu()

  return (
    <Modal opened={opened} onClose={onClose} title={t('customizeMenu')} size="lg" centered>
      {opened && <CommandLayer actions={[]} level="modal" />}
      <Text size="sm" c="dimmed" mb="xs">
        {t('customizeMenuHint')}
      </Text>
      <ScrollArea.Autosize mah="60vh" type="auto">
        <Stack gap="sm">
          <section className={classes.module}>
            <Text className={classes.moduleTitle}>{t('favourites')}</Text>
            {menu.favourites.length === 0 && (
              <Text size="sm" c="dimmed" px={8} py={4}>
                {t('noFavourites')}
              </Text>
            )}
            {menu.favourites.map((p, i) => (
              <Group key={p.id} className={classes.row} justify="space-between" wrap="nowrap">
                <Text size="sm">
                  {p.label}{' '}
                  <Text span size="xs" c="dimmed">
                    {p.module}
                  </Text>
                </Text>
                <Group gap={4} wrap="nowrap">
                  <MoveButtons
                    label={p.label}
                    first={i === 0}
                    last={i === menu.favourites.length - 1}
                    onMove={(step) => menu.moveFavourite(p.id, step)}
                  />
                  <Button variant="subtle" color="dark" onClick={() => menu.toggleFavourite(p.id)}>
                    {t('removeFavourite')}
                  </Button>
                </Group>
              </Group>
            ))}
          </section>

          {menu.all.map((m, i) => (
            <section key={m.id} className={classes.module}>
              <Group className={classes.moduleHeader} justify="space-between" wrap="nowrap">
                <Checkbox
                  label={<b>{m.label}</b>}
                  checked={!m.hidden}
                  onChange={() => menu.toggleHidden(m.id)}
                />
                <MoveButtons
                  label={m.label}
                  first={i === 0}
                  last={i === menu.all.length - 1}
                  onMove={(step) => menu.moveModule(m.module, step)}
                />
              </Group>
              {m.pages.map((p) => (
                <Group key={p.id} className={classes.row} justify="space-between" wrap="nowrap">
                  <Checkbox
                    label={p.label}
                    checked={!p.hidden}
                    disabled={m.hidden}
                    onChange={() => menu.toggleHidden(p.id)}
                  />
                  <FavouriteStar id={p.id} />
                </Group>
              ))}
            </section>
          ))}
        </Stack>
      </ScrollArea.Autosize>
      <Group justify="space-between" mt="md">
        <Button variant="default" onClick={menu.reset}>
          {t('resetMenu')}
        </Button>
        <Button onClick={onClose}>{t('close')}</Button>
      </Group>
    </Modal>
  )
}

function StarIcon({ filled }: { filled: boolean }): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path
        d="M7 1.2l1.8 3.7 4 .6-2.9 2.8.7 4L7 10.4l-3.6 1.9.7-4L1.2 5.5l4-.6z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
        fill={filled ? 'currentColor' : 'none'}
      />
    </svg>
  )
}

/** Adds a page to the favourites, or takes it out. Nothing for a page /meta does not offer. */
export function FavouriteStar({ id }: { id: string }): React.JSX.Element | null {
  const t = useText()
  const menu = usePersonalMenu()
  if (!menu.page(id)) return null
  const on = menu.isFavourite(id)
  const label = on ? t('removeFavourite') : t('addFavourite')
  return (
    <ActionIcon
      variant="subtle"
      color={on ? undefined : 'gray'}
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={() => menu.toggleFavourite(id)}
    >
      <StarIcon filled={on} />
    </ActionIcon>
  )
}
