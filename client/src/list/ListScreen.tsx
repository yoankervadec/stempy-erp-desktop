import { Button, Checkbox, Group, Menu, Select, Stack, Text, TextInput } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState
} from '@tanstack/react-table'
import { useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { ActionDialog, type ActionResult } from '../actions/ActionDialog'
import { queryList, sortOrDefault } from '../api/query'
import type { Id, MetaAction, MetaField, MetaResource, QuerySpec, Row } from '../api/types'
import { RecordModal } from '../record/RecordModal'
import { DataGrid } from '../grid/DataGrid'
import { alignOf, formatValue } from '../platform/format'
import { useLanguage } from '../platform/meta'
import { useText } from '../platform/useText'
import { ErrorAlert } from '../shell/ErrorAlert'
import { Page, type ActionGroups } from '../shell/Page'
import { FilterBar } from './FilterBar'
import { toWhere, type AppliedFilter } from './filters'

const PAGE_SIZES = ['25', '50', '100', '200']
const MAX_SORT_KEYS = 3

function initialSorting(resource: MetaResource): SortingState {
  const known = new Set(resource.fields.map((f) => f.name))
  return resource.defaultSort
    .filter((s) => known.has(s.field))
    .map((s) => ({ id: s.field, desc: s.dir === 'desc' }))
}

/** The listColumns in the server's order, then every other field (hidden until chosen). */
function columnOrder(resource: MetaResource): MetaField[] {
  const first = resource.listColumns
    .map((name) => resource.fields.find((f) => f.name === name))
    .filter((f): f is MetaField => !!f)
  return [...first, ...resource.fields.filter((f) => !first.includes(f))]
}

/** Columns shown first: the resource's listColumns; the others can be turned on. */
function initialVisibility(resource: MetaResource): VisibilityState {
  const shown = new Set(resource.listColumns)
  if (shown.size === 0) return {}
  return Object.fromEntries(resource.fields.map((f) => [f.name, shown.has(f.name)]))
}

/**
 * The generic list of one resource: columns from /meta, and every sort,
 * filter, search and page done by the server with QUERY. There is no total
 * count: paging follows page.hasMore.
 */
export function ListScreen({ resource }: { resource: MetaResource }): React.JSX.Element {
  const t = useText()
  const language = useLanguage()
  const navigate = useNavigate()

  /** Modal resources open over the list; the others on their own page. */
  const [modal, setModal] = useState<{ id: Id | null } | null>(null)
  const [action, setAction] = useState<MetaAction | null>(null)
  const listActions = resource.actions.filter((a) => a.scope === 'resource')
  const open = (id: Id | null): void => {
    if (resource.presentation === 'modal') setModal({ id })
    else
      void navigate({
        to: '/r/$resourceKey/$recordId',
        params: { resourceKey: resource.key, recordId: id == null ? 'new' : String(id) }
      })
  }

  const [sorting, setSorting] = useState<SortingState>(() => initialSorting(resource))
  const [visibility, setVisibility] = useState<VisibilityState>(() => initialVisibility(resource))
  const [filters, setFilters] = useState<AppliedFilter[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [search] = useDebouncedValue(searchInput.trim(), 300)
  const [limit, setLimit] = useState(50)
  const [offset, setOffset] = useState(0)

  // Any change to what is asked starts again at the first page.
  const [lastAsked, setLastAsked] = useState({ sorting, filters, search, limit })
  if (
    lastAsked.sorting !== sorting ||
    lastAsked.filters !== filters ||
    lastAsked.search !== search ||
    lastAsked.limit !== limit
  ) {
    setLastAsked({ sorting, filters, search, limit })
    setOffset(0)
  }

  const spec: QuerySpec = {
    where: toWhere(filters),
    sort: sortOrDefault(
      resource,
      sorting.map((s) => ({ field: s.id, dir: s.desc ? 'desc' : 'asc' }))
    ),
    page: { limit, offset },
    ...(resource.searchable && search ? { search: search.slice(0, 100) } : {})
  }

  const list = useQuery({
    queryKey: ['list', resource.key, spec],
    queryFn: () => queryList(resource, spec),
    placeholderData: keepPreviousData
  })

  const columns = useMemo<ColumnDef<Row>[]>(
    () =>
      columnOrder(resource).map((f) => ({
        id: f.name,
        accessorFn: (row) => row[f.name],
        header: f.label,
        enableSorting: f.sortable,
        enableHiding: true,
        meta: { align: alignOf(f.type) },
        cell: ({ row }) => {
          const value = row.original[f.name]
          const text = formatValue(f, value, row.original, language)
          const deleted = f.type === 'reference' && row.original._refs?.[f.name]?.deleted
          return deleted ? (
            <Text span size="sm" td="line-through" c="dimmed">
              {text}
            </Text>
          ) : (
            text
          )
        }
      })),
    [resource, language]
  )

  // TanStack Table returns a mutable instance the React Compiler can't memoize; it
  // re-renders correctly without memoization, so the compiler skipping this is fine.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: list.data?.data ?? [],
    columns,
    getRowId: (row, index) => String(row[resource.idField] ?? index),
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
    enableMultiSort: true,
    maxMultiSortColCount: MAX_SORT_KEYS,
    sortDescFirst: false,
    state: { sorting, columnVisibility: visibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility
  })

  const rows = list.data?.data ?? []
  const page = list.data?.page
  const hasMore = page?.hasMore ?? false

  const actions: ActionGroups = [
    resource.can.create ? [{ key: 'new', label: t('new'), onClick: () => open(null) }] : [],
    // The resource's own actions, as /meta names them.
    listActions.map((a) => ({
      key: `action:${a.name}`,
      label: a.label,
      onClick: () => setAction(a)
    })),
    [
      {
        key: 'refresh',
        label: t('refresh'),
        loading: list.isFetching,
        onClick: () => void list.refetch()
      }
    ]
  ]

  const tools = (
    <>
      {resource.searchable && (
        <TextInput
          placeholder={t('search')}
          aria-label={t('search')}
          w={220}
          maxLength={100}
          value={searchInput}
          onChange={(e) => setSearchInput(e.currentTarget.value)}
        />
      )}
      <Menu closeOnItemClick={false} position="bottom-end">
        <Menu.Target>
          <Button variant="default">{t('columns')}</Button>
        </Menu.Target>
        <Menu.Dropdown mah={400} style={{ overflowY: 'auto' }}>
          {table.getAllLeafColumns().map((column) => (
            <Menu.Item key={column.id} onClick={column.getToggleVisibilityHandler()}>
              <Checkbox
                readOnly
                checked={column.getIsVisible()}
                label={String(column.columnDef.header)}
                styles={{ input: { cursor: 'pointer' }, label: { cursor: 'pointer' } }}
              />
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    </>
  )

  return (
    <Page title={resource.label} actions={actions} tools={tools}>
      <Stack gap="sm">
        <FilterBar resource={resource} filters={filters} onChange={setFilters} />

        {list.isError && <ErrorAlert error={list.error} onRetry={() => list.refetch()} />}

        <DataGrid
          table={table}
          loading={list.isFetching}
          emptyText={t('noRows')}
          sortHint={t('sortHint')}
          onRowClick={(row) => open(row.original[resource.idField] as Id)}
        />

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            {rows.length > 0 && t('rowsRange', { from: offset + 1, to: offset + rows.length })}
          </Text>
          <Group gap="xs">
            <Text size="sm" c="dimmed">
              {t('rowsPerPage')}
            </Text>
            <Select
              size="xs"
              w={80}
              data={PAGE_SIZES}
              value={String(limit)}
              allowDeselect={false}
              onChange={(v) => v && setLimit(Number(v))}
              aria-label={t('rowsPerPage')}
            />
            <Button
              variant="default"
              size="xs"
              disabled={offset === 0 || list.isFetching}
              onClick={() => setOffset(Math.max(0, offset - limit))}
            >
              {t('previousPage')}
            </Button>
            <Button
              variant="default"
              size="xs"
              disabled={!hasMore || list.isFetching}
              onClick={() => setOffset(offset + limit)}
            >
              {t('nextPage')}
            </Button>
          </Group>
        </Group>

        {modal && (
          <RecordModal
            resource={resource}
            id={modal.id}
            onOpen={(id) => setModal({ id })}
            onClose={() => setModal(null)}
          />
        )}
        {action && (
          <ActionDialog
            action={action}
            recordId={null}
            confirmText={null}
            onClose={() => setAction(null)}
            onDone={(result: ActionResult) => {
              setAction(null)
              void list.refetch()
              // An action that made a record (201 with its row) shows it.
              const id = (result.body as Row | null)?.[resource.idField]
              if (result.status === 201 && typeof id === 'number') open(id)
            }}
          />
        )}
      </Stack>
    </Page>
  )
}
