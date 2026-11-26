import { Box, Center, LoadingOverlay, Table, Text, UnstyledButton } from '@mantine/core'
import {
  flexRender,
  type Header,
  type Row as TableRow,
  type Table as TanTable
} from '@tanstack/react-table'

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

export interface DataGridProps<T> {
  table: TanTable<T>
  /** A request is running: the rows shown are the previous ones. */
  loading?: boolean
  emptyText: string
  sortHint?: string
  onRowClick?: (row: TableRow<T>) => void
}

/**
 * Renders a TanStack table with Mantine's Table. Sorting, filtering and paging
 * are the caller's (server-side); this only draws the rows it is given.
 */
export function DataGrid<T>({
  table,
  loading,
  emptyText,
  sortHint,
  onRowClick
}: DataGridProps<T>): React.JSX.Element {
  const rows = table.getRowModel().rows
  const multiSort = table.getState().sorting.length > 1
  const columnCount = table.getVisibleLeafColumns().length
  return (
    <Box pos="relative">
      <LoadingOverlay visible={!!loading} overlayProps={{ blur: 1 }} loaderProps={{ size: 'sm' }} />
      <Table.ScrollContainer minWidth={columnCount * 120}>
        <Table striped highlightOnHover={!!onRowClick} stickyHeader verticalSpacing={6}>
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
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={onRowClick ? { cursor: 'pointer' } : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <Table.Td
                    key={cell.id}
                    style={{
                      textAlign: cell.column.columnDef.meta?.align ?? 'left',
                      whiteSpace: 'nowrap',
                      maxWidth: 360,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Table.Td>
                ))}
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
