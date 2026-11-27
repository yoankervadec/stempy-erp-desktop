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

/** Where a dragged column would land, and its drop mark. */
export type DropSide = 'before' | 'after'

const COLUMN_TYPE = 'application/x-stempy-column'

interface HeaderDrag {
  /** The column being dragged, if any. */
  dragging: string | null
  setDragging: (id: string | null) => void
  drop: { id: string; side: DropSide } | null
  setDrop: (drop: { id: string; side: DropSide } | null) => void
  onColumnMove: (id: string, target: string, side: DropSide) => void
}

function HeaderCell<T>({
  header,
  sortHint,
  multiSort,
  drag
}: {
  header: Header<T, unknown>
  sortHint?: string
  multiSort: boolean
  drag?: HeaderDrag
}): React.JSX.Element {
  const column = header.column
  const align = column.columnDef.meta?.align ?? 'left'
  const content = flexRender(column.columnDef.header, header.getContext())
  const sorted = column.getIsSorted()
  const sortIndex = column.getSortIndex()
  const resizable = column.getCanResize()
  const label = column.getCanSort() ? (
    <UnstyledButton
      onClick={column.getToggleSortingHandler()}
      title={sortHint}
      tabIndex={-1}
      className={classes.sortButton}
      style={{ flexDirection: align === 'right' ? 'row-reverse' : 'row' }}
    >
      <span className={classes.headerText}>{content}</span>
      {sorted && <SortArrow dir={sorted} />}
      {sorted && multiSort && (
        <Text span size="xs" c="dimmed">
          {sortIndex + 1}
        </Text>
      )}
    </UnstyledButton>
  ) : (
    <span className={classes.headerText}>{content}</span>
  )

  const dropHere = drag?.drop?.id === column.id ? drag.drop.side : undefined
  return (
    <Table.Th
      style={{
        textAlign: align,
        whiteSpace: 'nowrap'
      }}
      className={classes.th}
      data-drop={dropHere}
      aria-sort={
        !column.getCanSort()
          ? undefined
          : sorted === 'asc'
            ? 'ascending'
            : sorted === 'desc'
              ? 'descending'
              : 'none'
      }
      onDragOver={
        drag &&
        ((e) => {
          if (!drag.dragging || !e.dataTransfer.types.includes(COLUMN_TYPE)) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          const box = e.currentTarget.getBoundingClientRect()
          const side: DropSide = e.clientX < box.left + box.width / 2 ? 'before' : 'after'
          if (drag.drop?.id !== column.id || drag.drop.side !== side) {
            drag.setDrop({ id: column.id, side })
          }
        })
      }
      onDrop={
        drag &&
        ((e) => {
          e.preventDefault()
          if (drag.dragging && dropHere) drag.onColumnMove(drag.dragging, column.id, dropHere)
          drag.setDragging(null)
          drag.setDrop(null)
        })
      }
    >
      {/* The label is what is dragged: the resize handle beside it must not start a drag. */}
      <div
        className={classes.headerLabel}
        style={{ justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}
        draggable={!!drag}
        onDragStart={
          drag &&
          ((e) => {
            e.dataTransfer.setData(COLUMN_TYPE, column.id)
            e.dataTransfer.effectAllowed = 'move'
            drag.setDragging(column.id)
          })
        }
        onDragEnd={
          drag &&
          (() => {
            drag.setDragging(null)
            drag.setDrop(null)
          })
        }
      >
        {label}
      </div>
      {resizable && (
        <div
          className={classes.resizer}
          data-resizing={column.getIsResizing() || undefined}
          onMouseDown={header.getResizeHandler()}
          onDoubleClick={() => column.resetSize()}
          onClick={(e) => e.stopPropagation()}
          aria-hidden
        />
      )}
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
  /**
   * Edit mode: cells hold inputs. Up / Down and Enter move between rows (not
   * inside an open dropdown or a text area), Tab between cells, focus follows the
   * cursor; rows are not opened.
   */
  editing?: boolean
  /** How a row stands in edit mode, drawn at its start. */
  rowState?: (row: TableRow<T>) => 'dirty' | 'saving' | 'error' | undefined
  /**
   * Columns can be dragged by their header: told where one was dropped. (Widths
   * follow the table's own enableColumnResizing: fixed, with a handle per header.)
   */
  onColumnMove?: (id: string, target: string, side: DropSide) => void
}

/** A field the user types in, where the arrows belong to the text or a dropdown. */
function inField(target: EventTarget | null): HTMLElement | null {
  const el = target as HTMLElement | null
  return el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) ? el : null
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
  onRowOpen: openRow,
  onActiveCellChange,
  editing,
  rowState,
  onColumnMove
}: DataGridProps<T>): React.JSX.Element {
  const onRowOpen = editing ? undefined : openRow
  const rows = table.getRowModel().rows
  const columns = table.getVisibleLeafColumns()
  const multiSort = table.getState().sorting.length > 1
  const body = useRef<HTMLTableSectionElement>(null)
  const [cursor, setCursor] = useState({ row: 0, col: 0 })
  const [dragging, setDragging] = useState<string | null>(null)
  const [drop, setDrop] = useState<{ id: string; side: DropSide } | null>(null)
  const drag: HeaderDrag | undefined = onColumnMove
    ? { dragging, setDragging, drop, setDrop, onColumnMove }
    : undefined
  // Sized columns: a fixed layout, as wide as its columns (NAV), not stretched.
  const fixed = !!table.options.enableColumnResizing

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

  // Edit mode: the cursor's cell takes the focus, if the focus is in the grid already.
  useEffect(() => {
    const table = body.current?.closest('table')
    if (!editing || !table || !table.contains(document.activeElement)) return
    const cell = body.current?.querySelector<HTMLElement>(`[data-row="${row}"] [data-col="${col}"]`)
    if (!cell || cell.contains(document.activeElement)) return
    const input = cell.querySelector<HTMLElement>('input:not([type=hidden]), textarea, button')
    ;(input ?? table).focus()
  }, [editing, row, col])

  const onKeyDown = (e: React.KeyboardEvent): void => {
    const field = inField(e.target)
    if (field) {
      if (!editing || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return
      // A dropdown open, or a multi-line text: the keys are the field's.
      if (field.getAttribute('aria-expanded') === 'true' || field.tagName === 'TEXTAREA') return
      const step = e.key === 'ArrowDown' || e.key === 'Enter' ? 1 : e.key === 'ArrowUp' ? -1 : 0
      if (step === 0 || rows.length === 0) return
      e.preventDefault()
      move(row + step, col)
      return
    }
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
      Enter: () => (editing ? move(row + 1, col) : activeRow && onRowOpen?.(activeRow))
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
      <Table.ScrollContainer minWidth={fixed ? table.getTotalSize() : columns.length * 120}>
        <Table
          stickyHeader
          className={classes.grid}
          style={fixed ? { tableLayout: 'fixed', width: table.getTotalSize() } : undefined}
          data-fixed={fixed || undefined}
          data-editing={editing || undefined}
          tabIndex={0}
          onKeyDown={onKeyDown}
          aria-rowcount={rows.length}
        >
          {/* A fixed layout takes its widths from here; header widths are ignored. */}
          {fixed && (
            <colgroup>
              {table.getVisibleLeafColumns().map((c) => (
                <col key={c.id} style={{ width: c.getSize() }} />
              ))}
            </colgroup>
          )}
          <Table.Thead>
            {table.getHeaderGroups().map((group) => (
              <Table.Tr key={group.id}>
                {group.headers.map((header) => (
                  <HeaderCell
                    key={header.id}
                    header={header}
                    sortHint={sortHint}
                    multiSort={multiSort}
                    drag={drag}
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
                data-state={editing ? rowState?.(r) : undefined}
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
                      // Tab into a cell's input moves the cursor there.
                      onFocus={() => (ri !== row || ci !== col) && setCursor({ row: ri, col: ci })}
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
