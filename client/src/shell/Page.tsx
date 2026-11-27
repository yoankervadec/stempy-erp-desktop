import { Anchor, Box, Button, Divider, Group, Text } from '@mantine/core'
import { Fragment, type ReactNode } from 'react'
import classes from './Page.module.css'

/**
 * One command of a page, drawn in its action bar. Kept as data (not a button) so
 * the command bar and the keyboard shortcuts can reach the same commands.
 */
export interface PageAction {
  key: string
  label: string
  onClick: () => void
  disabled?: boolean
  /** Shown on hover, e.g. why the action is disabled. */
  title?: string
  loading?: boolean
  /** The page's main action (Save): drawn filled. Others are flat. */
  primary?: boolean
  danger?: boolean
}

/** Groups of actions, separated by a rule; empty groups are dropped. */
export type ActionGroups = PageAction[][]

export function ActionButton({ action }: { action: PageAction }): React.JSX.Element {
  return (
    <Button
      variant={action.primary ? 'filled' : 'subtle'}
      color={action.danger ? 'red' : action.primary ? undefined : 'dark'}
      disabled={action.disabled}
      loading={action.loading}
      title={action.title}
      onClick={action.onClick}
      className={action.primary ? undefined : classes.flat}
    >
      {action.label}
    </Button>
  )
}

/** The action groups in a row, a vertical rule between groups. */
export function ActionBar({ groups }: { groups: ActionGroups }): React.JSX.Element | null {
  const shown = groups.filter((g) => g.length > 0)
  if (shown.length === 0) return null
  return (
    <Group gap={2} wrap="wrap">
      {shown.map((group, i) => (
        <Fragment key={group[0].key}>
          {i > 0 && <Divider orientation="vertical" mx={4} />}
          {group.map((a) => (
            <ActionButton key={a.key} action={a} />
          ))}
        </Fragment>
      ))}
    </Group>
  )
}

export interface PageProps {
  title: ReactNode
  /** Beside the title, e.g. a "New" badge. */
  badge?: ReactNode
  /** Above the title: where this page sits, the first part clickable. */
  parent?: { label: string; onClick: () => void }
  actions?: ActionGroups
  /** Right end of the action bar: search box, column chooser. */
  tools?: ReactNode
  /**
   * The body lays out its own columns (a list's filter pane beside its grid): no
   * padding, a row that fills the window's height.
   */
  flush?: boolean
  children: ReactNode
}

/**
 * The frame of every signed-in screen: a header band (breadcrumb, title, action
 * bar) that stays at the top while the body scrolls.
 */
export function Page({
  title,
  badge,
  parent,
  actions,
  tools,
  flush,
  children
}: PageProps): React.JSX.Element {
  const bar = actions && <ActionBar groups={actions} />
  return (
    <div className={classes.page}>
      <Box className={classes.header}>
        {parent && (
          <Text size="xs" c="dimmed" mb={2}>
            <Anchor size="xs" onClick={parent.onClick}>
              {parent.label}
            </Anchor>
          </Text>
        )}
        <Group gap="xs" wrap="nowrap">
          <Text component="h1" className={classes.title}>
            {title}
          </Text>
          {badge}
        </Group>
        {(bar || tools) && (
          <Group justify="space-between" wrap="nowrap" mt={6} gap="md" mih={26}>
            {bar ?? <span />}
            {tools && (
              <Group gap="xs" wrap="nowrap">
                {tools}
              </Group>
            )}
          </Group>
        )}
      </Box>
      <Box className={flush ? classes.flushBody : classes.body}>{children}</Box>
    </div>
  )
}
