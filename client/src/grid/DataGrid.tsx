import { Box, Center, LoadingOverlay, Table, Text, UnstyledButton } from '@mantine/core'
import {
  flexRender,
  type Header,
  type Row as TableRow,
  type Table as TanTable
} from '@tanstack/react-table'
import { useEffect, useRef, useState } from 'react'
import classes from './DataGrid.module.css'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    align?: 'left' | 'right'
  }
}

function SortArrow({ dir }: { dir: 'asc' | 'desc' }): React.JSX.Element {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden style={{ flex: 'none' }}>
      <path d={dir === 'asc' ? 'M5 2 L9 8 L1 8 Z' : 'M5 8 L9 2 L1 2 Z'} fill="currentColor" />
    </svg>
  )
}

function HeaderCell<T>({
  header,
  sortHint,
  multiSort
}: {
  header: Header<T, unknown>
  sortHint?: string
  multiSort: boolean
}): React.JSX.Element {
  const column = header.column
  const align = column.columnDef.meta?.align ?? 'left'
  const content = flexRender(column.columnDef.header, header.getContext())
  const sorted = column.getIsSorted()
  const sortIndex = column.getSortIndex()
  if (!column.getCanSort()) {
    return <Table.Th style={{ textAlign: align, whiteSpace: 'nowrap' }}>{content}</Table.Th>
  }
  return (
    <Table.Th
      style={{ textAlign: align, whiteSpace: 'nowrap' }}
      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'}
    >
      <UnstyledButton
        onClick={column.getToggleSortingHandler()}
        title={sortHint}
        tabIndex={-1}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontWeight: 'inherit',
          flexDirection: align === 'right' ? 'row-reverse' : 'row'
        }}
      >
        <span>{content}</span>
        {sorted && <SortArrow dir={sorted} />}
        {sorted && multiSort && (
          <Text span size="xs" c="dimmed">
            {sortIndex + 1}
          </Text>
        )}
      </UnstyledButton>
    </Table.Th>
  )
}

/** The cell the keyboard is on. */
export interface ActiveCell<T> {
  row: TableRow<T>
  columnId: string
}

export interface DataGridProps<T> {
  table: TanTable<T>
  /** A request is running: the rows shown are the previous ones. */
  loading?: boolean
  emptyText: string
  sortHint?: string
  /**
   * Opens a row: Enter, a double click, or a click in the first column (drawn as a
   * link, as in Business Central). A click elsewhere only moves to the cell.
   */
  onRowOpen?: (row: TableRow<T>) => void
  /** Told when the cell the keyboard is on changes. */
  onActiveCellChange?: (cell: ActiveCell<T> | null) => void
}

const PAGE = 10

/**
 * Renders a TanStack table with Mantine's Table. Sorting, filtering and paging
 * are the caller's (server-side); this only draws the rows it is given, and
 * moves a cell cursor over them with the keyboard (arrows, Page Up / Down,
 * Home / End, Enter).
 */
export function DataGrid<T>({
  table,
  loading,
  emptyText,
  sortHint,
  onRowOpen,
  onActiveCellChange
}: DataGridProps<T>): React.JSX.Element {
  const rows = table.getRowModel().rows
  const columns = table.getVisibleLeafColumns()
  const multiSort = table.getState().sorting.length > 1
  const body = useRef<HTMLTableSectionElement>(null)
  const [cursor, setCursor] = useState({ row: 0, col: 0 })

  // The rows or columns changed (another page, a filter): stay inside them.
  const row = Math.min(cursor.row, Math.max(0, rows.length - 1))
  const col = Math.min(cursor.col, Math.max(0, columns.length - 1))
  const activeRow = rows[row]
  const activeColumn = columns[col]

  useEffect(() => {
    onActiveCellChange?.(
      activeRow && activeColumn ? { row: activeRow, columnId: activeColumn.id } : null
    )
  }, [activeRow, activeColumn, onActiveCellChange])

  useEffect(() => {
    body.current
      ?.querySelector(`[data-row="${row}"] [data-col="${col}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [row, col])

  const move = (r: number, c: number): void =>
    setCursor({
      row: Math.max(0, Math.min(rows.length - 1, r)),
      col: Math.max(0, Math.min(columns.length - 1, c))
    })

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.altKey || e.metaKey || (e.ctrlKey && e.key !== 'Home' && e.key !== 'End')) return
    const keys: Record<string, () => void> = {
      ArrowDown: () => move(row + 1, col),
      ArrowUp: () => move(row - 1, col),
      ArrowRight: () => move(row, col + 1),
      ArrowLeft: () => move(row, col - 1),
      PageDown: () => move(row + PAGE, col),
      PageUp: () => move(row - PAGE, col),
      // Home / End: the row's first or last cell; with Ctrl, the first or last row.
      Home: () => (e.ctrlKey ? move(0, col) : move(row, 0)),
      End: () => (e.ctrlKey ? move(rows.length - 1, col) : move(row, columns.length - 1)),
      Enter: () => activeRow && onRowOpen?.(activeRow)
    }
    const handler = keys[e.key]
    if (handler && rows.length > 0) {
      e.preventDefault()
      handler()
    }
  }

  return (
    <Box pos="relative">
      <LoadingOverlay visible={!!loading} />
      <Table.ScrollContainer minWidth={columns.length * 120}>
        <Table
          stickyHeader
          className={classes.grid}
          tabIndex={0}
          onKeyDown={onKeyDown}
          aria-rowcount={rows.length}
        >
          <Table.Thead>
            {table.getHeaderGroups().map((group) => (
              <Table.Tr key={group.id}>
                {group.headers.map((header) => (
                  <HeaderCell
                    key={header.id}
                    header={header}
                    sortHint={sortHint}
                    multiSort={multiSort}
                  />
                ))}
              </Table.Tr>
            ))}
          </Table.Thead>
          <Table.Tbody ref={body}>
            {rows.map((r, ri) => (
              <Table.Tr
                key={r.id}
                data-row={ri}
                data-active={ri === row || undefined}
                onDoubleClick={onRowOpen ? () => onRowOpen(r) : undefined}
              >
                {r.getVisibleCells().map((cell, ci) => {
                  const opens = !!onRowOpen && ci === 0
                  return (
                    <Table.Td
                      key={cell.id}
                      data-col={ci}
                      data-active={(ri === row && ci === col) || undefined}
                      className={opens ? classes.opens : undefined}
                      onMouseDown={() => setCursor({ row: ri, col: ci })}
                      onClick={opens ? () => onRowOpen(r) : undefined}
                      style={{ textAlign: cell.column.columnDef.meta?.align ?? 'left' }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Table.Td>
                  )
                })}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {rows.length === 0 && !loading && (
        <Center py="xl">
          <Text c="dimmed">{emptyText}</Text>
        </Center>
      )}
    </Box>
  )
}
