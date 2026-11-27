import { Text, Title } from '@mantine/core'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { useNavigate } from '@tanstack/react-router'
import { useMemo } from 'react'
import { queryList } from '../api/query'
import type { Id, LayoutCollection, Row } from '../api/types'
import { DataGrid } from '../grid/DataGrid'
import { alignOf, formatValue } from '../platform/format'
import { useLanguage, useResource } from '../platform/meta'
import { useText } from '../platform/useText'
import { ErrorAlert } from '../shell/ErrorAlert'

const LIMIT = 100

/**
 * A collection whose rows are another resource: QUERY that resource where the
 * collection's field equals this record's id. Read-only here; a row opens on its own.
 */
export function ChildList({
  collection: c,
  parentId
}: {
  collection: LayoutCollection
  parentId: Id
}): React.JSX.Element | null {
  const t = useText()
  const language = useLanguage()
  const navigate = useNavigate()
  const source = c.source!
  const child = useResource(source.resource)

  const list = useQuery({
    queryKey: ['list', source.resource, 'child', source.field, parentId],
    queryFn: () =>
      queryList(child!, {
        where: { field: source.field, op: 'equals', value: parentId },
        sort: child!.defaultSort,
        page: { limit: LIMIT }
      }),
    enabled: !!child,
    placeholderData: keepPreviousData
  })

  const columns = useMemo<ColumnDef<Row>[]>(
    () =>
      c.columns.map((f) => ({
        id: f.name,
        header: f.label,
        enableSorting: false,
        meta: { align: alignOf(f.type) },
        cell: ({ row }) => formatValue(f, row.original[f.name], row.original, language)
      })),
    [c.columns, language]
  )

  // TanStack Table returns a mutable instance the React Compiler can't memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: list.data?.data ?? [],
    columns,
    getRowId: (row, index) => String(row[child?.idField ?? 'id'] ?? index),
    getCoreRowModel: getCoreRowModel()
  })

  if (!child) return null
  return (
    <div>
      <Title order={5} mb={4}>
        {c.label}
      </Title>
      {list.isError && <ErrorAlert error={list.error} onRetry={() => list.refetch()} />}
      <DataGrid
        table={table}
        loading={list.isFetching}
        emptyText={t('noRows')}
        onRowClick={(r) =>
          navigate({
            to: '/r/$resourceKey/$recordId',
            params: { resourceKey: child.key, recordId: r.id }
          })
        }
      />
      {list.data?.page.hasMore && (
        <Text size="xs" c="dimmed" mt={4}>
          {t('moreRows', { n: LIMIT })}
        </Text>
      )}
    </div>
  )
}
