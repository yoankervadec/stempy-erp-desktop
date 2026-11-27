import { ActionIcon, Button, Checkbox, Group, Popover, ScrollArea, Stack } from '@mantine/core'
import type { Table } from '@tanstack/react-table'
import type { Row } from '../api/types'
import { useText } from '../platform/useText'

function Arrow({ dir }: { dir: 'left' | 'right' }): React.JSX.Element {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
      <path
        d={dir === 'left' ? 'M7 1 L2 5 L7 9' : 'M3 1 L8 5 L3 9'}
        stroke="currentColor"
        fill="none"
        strokeWidth="1.5"
      />
    </svg>
  )
}

/**
 * The Columns button: every column in its current order, to show or hide and to
 * move left or right (the keyboard's way to reorder; headers can also be
 * dragged), and a reset to the server's layout.
 */
export function ColumnsPanel({
  table,
  order,
  onMove,
  onReset
}: {
  table: Table<Row>
  order: string[]
  onMove: (id: string, step: -1 | 1) => void
  onReset: () => void
}): React.JSX.Element {
  const t = useText()
  return (
    <Popover position="bottom-end" trapFocus shadow="sm">
      <Popover.Target>
        <Button variant="default">{t('columns')}</Button>
      </Popover.Target>
      <Popover.Dropdown p={0}>
        <ScrollArea.Autosize mah={420} type="auto">
          <Stack gap={0} p={4}>
            {order.map((id, i) => {
              const column = table.getColumn(id)
              if (!column) return null
              const label = String(column.columnDef.header)
              return (
                <Group key={id} gap={4} wrap="nowrap" justify="space-between" px={4} py={2}>
                  <Checkbox
                    size="xs"
                    checked={column.getIsVisible()}
                    onChange={() => column.toggleVisibility()}
                    label={label}
                  />
                  <Group gap={2} wrap="nowrap">
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      disabled={i === 0}
                      onClick={() => onMove(id, -1)}
                      aria-label={`${t('moveLeft')}: ${label}`}
                      title={t('moveLeft')}
                    >
                      <Arrow dir="left" />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      disabled={i === order.length - 1}
                      onClick={() => onMove(id, 1)}
                      aria-label={`${t('moveRight')}: ${label}`}
                      title={t('moveRight')}
                    >
                      <Arrow dir="right" />
                    </ActionIcon>
                  </Group>
                </Group>
              )
            })}
          </Stack>
        </ScrollArea.Autosize>
        <Group
          justify="flex-end"
          p={6}
          style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
        >
          <Button variant="default" onClick={onReset}>
            {t('resetColumns')}
          </Button>
        </Group>
      </Popover.Dropdown>
    </Popover>
  )
}
