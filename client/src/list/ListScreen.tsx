import { Alert, Badge, Button, Group, Select, Stack, Text, TextInput } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { useBlocker, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActionDialog, type ActionResult } from '../actions/ActionDialog'
import { queryList, sortOrDefault } from '../api/query'
import type { Id, MetaAction, MetaResource, QuerySpec, Row } from '../api/types'
import { RecordModal } from '../record/RecordModal'
import { DataGrid, type ActiveCell } from '../grid/DataGrid'
import { alignOf, formatValue } from '../platform/format'
import { resourcePageId } from '../platform/menu'
import { useLanguage } from '../platform/meta'
import { isBoolean, usePreference } from '../platform/preferences'
import { useSessionInfo } from '../platform/session'
import { useText } from '../platform/useText'
import { ConfirmDialog } from '../shell/ConfirmDialog'
import { ErrorAlert } from '../shell/ErrorAlert'
import { Page, type ActionGroups } from '../shell/Page'
import { ColumnsPanel } from './ColumnsPanel'
import { FilterPane } from './FilterPane'
import type { ViewsControl } from './ViewsSection'
import {
  EMPTY_VIEWS,
  isListViews,
  newViewId,
  readViews,
  sameAsView,
  toApplied,
  toSaved,
  toSort,
  viewsKey,
  type ListView
} from './views'
import {
  defaultWidth,
  EMPTY_LAYOUT,
  isListLayout,
  MAX_WIDTH,
  MIN_WIDTH,
  moveColumn,
  PAGE_SIZES,
  resolveOrder,
  resolvePageSize,
  resolveSorting,
  resolveVisibility,
  resolveWidths,
  type ListLayout
} from './layout'
import { ListCell } from './ListCell'
import { canEditInList, canEditList, ListEditorContext, useListEditor } from './useListEditor'
import classes from './ListScreen.module.css'
import {
  filterableFields,
  filterChoices,
  MAX_FILTERS,
  toWhere,
  type AppliedFilter,
  type FilterChoice
} from './filters'

/** One empty list for every render: a new [] each time would look like new rows. */
const NO_ROWS: Row[] = []
const MAX_SORT_KEYS = 3

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

  // The user's layout of this list (columns, sort, page size), over the server's defaults.
  const [layout, setLayout] = usePreference(`list.${resource.key}`, EMPTY_LAYOUT, isListLayout)
  const patchLayout = (patch: Partial<ListLayout>): void => setLayout((l) => ({ ...l, ...patch }))
  const order = useMemo(() => resolveOrder(resource, layout.order), [resource, layout.order])
  const visibility = useMemo(
    () => resolveVisibility(resource, layout.visible),
    [resource, layout.visible]
  )
  const widths = useMemo(() => resolveWidths(resource, layout.widths), [resource, layout.widths])
  const sorting = useMemo(() => resolveSorting(resource, layout.sort), [resource, layout.sort])
  const limit = resolvePageSize(layout.pageSize)
  // Saved views (filters, search, sort), per company; the list opens on the last one used.
  const { companyId } = useSessionInfo()
  const [storedViews, setStoredViews] = usePreference(
    viewsKey(resource.key, companyId ?? 0),
    EMPTY_VIEWS,
    isListViews
  )
  const savedViews = useMemo(() => readViews(resource, storedViews), [resource, storedViews])
  const [activeViewId, setActiveViewId] = useState<string | null>(() => savedViews.last ?? null)
  const activeView = savedViews.views.find((v) => v.id === activeViewId)
  const [filters, setFilters] = useState<AppliedFilter[]>(() => toApplied(activeView))
  // Shared by every list.
  const [paneOpen, setPaneOpen] = usePreference('list.filterPaneOpen', true, isBoolean)
  const canFilter = filterableFields(resource).length > 0
  const [activeCell, setActiveCell] = useState<ActiveCell<Row> | null>(null)
  const [searchInput, setSearchInput] = useState(() => activeView?.search ?? '')
  const [search] = useDebouncedValue(searchInput.trim(), 300)
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

  const listRows = list.data?.data ?? NO_ROWS
  const titleField = resource.fields.find((f) => f.name === resource.title)
  const editor = useListEditor(resource, listRows, {
    conflict: t('conflictTitle'),
    rowLabel: (row) =>
      (titleField && formatValue(titleField, row[titleField.name], row, language)) ||
      String(row[resource.idField])
  })
  const editable = canEditList(resource) && resource.fields.some(canEditInList)
  // What the grid shows: each row as last saved here, if newer than the list's copy.
  const data = useMemo(() => listRows.map(editor.shown), [listRows, editor.shown])

  // Read by callbacks that must keep their identity (the grid's, the router's blocker).
  const editorRef = useRef(editor)
  useEffect(() => {
    editorRef.current = editor
  })

  // NAV: a changed row is saved when the cursor leaves it.
  const lastRowKey = useRef<string | null>(null)
  const onActiveCellChange = useCallback((cell: ActiveCell<Row> | null) => {
    setActiveCell(cell)
    const ed = editorRef.current
    const key = cell ? ed.keyOf(cell.row.original) : null
    const previous = lastRowKey.current
    lastRowKey.current = key
    if (ed.editing && previous && previous !== key) void ed.saveRow(previous)
  }, [])

  const blocker = useBlocker({
    shouldBlockFn: () => editorRef.current.dirty,
    // Default true: refuse every unload (closing the window, quitting), changes or not.
    enableBeforeUnload: () => editorRef.current.dirty,
    withResolver: true
  })

  const leaveEditMode = async (): Promise<void> => {
    if (await editor.saveAll()) editor.setEditing(false)
  }

  const columns = useMemo<ColumnDef<Row>[]>(
    () =>
      resource.fields.map((f) => ({
        id: f.name,
        accessorFn: (row) => row[f.name],
        header: f.label,
        enableSorting: f.sortable,
        enableHiding: true,
        size: defaultWidth(f),
        minSize: MIN_WIDTH,
        maxSize: MAX_WIDTH,
        meta: { align: alignOf(f.type) },
        cell: ({ row }) => <ListCell field={f} row={row.original} />
      })),
    [resource]
  )

  // TanStack Table returns a mutable instance the React Compiler can't memoize; it
  // re-renders correctly without memoization, so the compiler skipping this is fine.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getRowId: (row, index) => String(row[resource.idField] ?? index),
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
    enableMultiSort: true,
    maxMultiSortColCount: MAX_SORT_KEYS,
    sortDescFirst: false,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    state: { sorting, columnVisibility: visibility, columnOrder: order, columnSizing: widths },
    onSortingChange: (u) => {
      const next = typeof u === 'function' ? u(sorting) : u
      patchLayout({ sort: next.map((s) => ({ field: s.id, dir: s.desc ? 'desc' : 'asc' })) })
    },
    onColumnVisibilityChange: (u) =>
      patchLayout({ visible: typeof u === 'function' ? u(visibility) : u }),
    onColumnSizingChange: (u) => patchLayout({ widths: typeof u === 'function' ? u(widths) : u })
  })

  const moveBy = (id: string, step: -1 | 1): void => {
    const target = order[order.indexOf(id) + step]
    if (target) patchLayout({ order: moveColumn(order, id, target, step < 0 ? 'before' : 'after') })
  }
  // Back to the server's columns; the sort and page size stay.
  const resetColumns = (): void =>
    patchLayout({ order: undefined, visible: undefined, widths: undefined })

  const writeViews = (views: ListView[], last: string | null): void =>
    setStoredViews({ views, ...(last ? { last } : {}) })
  const shownNow = (): Omit<ListView, 'id' | 'name'> => ({
    filters: toSaved(filters),
    ...(searchInput.trim() ? { search: searchInput.trim() } : {}),
    sort: toSort(sorting)
  })
  const viewsControl: ViewsControl = {
    views: savedViews.views,
    activeId: activeView?.id ?? null,
    // "All" too: it is modified once a filter or a search narrows it.
    modified: activeView
      ? !sameAsView(activeView, filters, searchInput.trim(), sorting)
      : filters.length > 0 || searchInput.trim() !== '',
    select: (id) => {
      const view = savedViews.views.find((v) => v.id === id)
      setActiveViewId(view?.id ?? null)
      setFilters(toApplied(view))
      setSearchInput(view?.search ?? '')
      if (view?.sort) patchLayout({ sort: view.sort })
      writeViews(savedViews.views, view?.id ?? null)
    },
    saveAs: (name) => {
      const view: ListView = { id: newViewId(), name, ...shownNow() }
      setActiveViewId(view.id)
      writeViews([...savedViews.views, view], view.id)
    },
    save: () => {
      if (!activeView) return
      writeViews(
        savedViews.views.map((v) => (v.id === activeView.id ? { ...v, ...shownNow() } : v)),
        activeView.id
      )
    },
    rename: (name) => {
      if (!activeView) return
      writeViews(
        savedViews.views.map((v) => (v.id === activeView.id ? { ...v, name } : v)),
        activeView.id
      )
    },
    remove: () => {
      if (!activeView) return
      setActiveViewId(null)
      writeViews(
        savedViews.views.filter((v) => v.id !== activeView.id),
        null
      )
    }
  }

  const rows = list.data?.data ?? []
  const page = list.data?.page
  const hasMore = page?.hasMore ?? false

  // Alt+F3, as in NAV: filter the list on the value of the cell the cursor is on. It
  // replaces a filter already on that field.
  const cellFilter = ((): AppliedFilter[] | null => {
    if (!activeCell) return null
    const field = filterableFields(resource).find((f) => f.name === activeCell.columnId)
    if (!field) return null
    const value = activeCell.row.original[field.name]
    const choices = filterChoices(field)
    const choice: FilterChoice | null =
      value == null
        ? choices.includes('isEmpty')
          ? 'isEmpty'
          : null
        : choices.includes('equals')
          ? 'equals'
          : null
    if (!choice) return null
    const others = filters.filter((f) => f.field !== field.name)
    if (others.length >= MAX_FILTERS) return null
    return [
      ...others,
      {
        id: `cell:${field.name}`,
        field: field.name,
        choice,
        value: value ?? undefined,
        display: value == null ? '' : formatValue(field, value, activeCell.row.original, language)
      }
    ]
  })()

  const actions: ActionGroups = [
    resource.can.create
      ? [{ key: 'new', label: t('new'), hotkey: 'mod+n', onClick: () => open(null) }]
      : [],
    // The resource's own actions, as /meta names them.
    listActions.map((a) => ({
      key: `action:${a.name}`,
      label: a.label,
      onClick: () => setAction(a)
    })),
    editable
      ? editor.editing
        ? [
            {
              key: 'save',
              label: t('save'),
              hotkey: 'mod+s',
              primary: true,
              loading: editor.saving,
              disabled: !editor.dirty,
              onClick: () => void editor.saveAll()
            },
            ...(editor.dirty
              ? [{ key: 'discard', label: t('discardChanges'), onClick: editor.discard }]
              : []),
            {
              key: 'editList',
              label: t('viewList'),
              hotkey: 'mod+e',
              onClick: () => void leaveEditMode()
            }
          ]
        : [
            {
              key: 'editList',
              label: t('editList'),
              hotkey: 'mod+e',
              onClick: () => editor.setEditing(true)
            }
          ]
      : [],
    [
      {
        key: 'refresh',
        label: t('refresh'),
        hotkey: 'f5',
        loading: list.isFetching,
        onClick: () => void list.refetch()
      }
    ]
  ]

  const tools = (
    <>
      {canFilter && (
        <Button
          variant={paneOpen ? 'light' : 'default'}
          aria-pressed={paneOpen}
          onClick={() => setPaneOpen((o) => !o)}
        >
          {t('filters')}
          {filters.length > 0 && ` (${filters.length})`}
        </Button>
      )}
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
      <ColumnsPanel table={table} order={order} onMove={moveBy} onReset={resetColumns} />
    </>
  )

  return (
    <Page
      title={resource.label}
      favourite={resourcePageId(resource.key)}
      badge={
        activeView && (
          <Badge title={viewsControl.modified ? t('viewModified') : undefined}>
            {activeView.name}
            {viewsControl.modified && ' *'}
          </Badge>
        )
      }
      actions={actions}
      tools={tools}
      commands={[
        ...(canFilter
          ? [
              {
                id: 'filters',
                label: paneOpen ? t('hideFilters') : t('showFilters'),
                hotkey: 'shift+f3',
                run: () => setPaneOpen((o) => !o)
              },
              {
                id: 'filterOnCell',
                label: t('filterOnValue'),
                hotkey: 'alt+f3',
                disabled: !cellFilter,
                run: () => cellFilter && setFilters(cellFilter)
              }
            ]
          : []),
        { id: 'resetColumns', label: t('resetColumns'), run: resetColumns },
        ...(canFilter
          ? [
              {
                id: 'view:all',
                label: `${t('view')}: ${t('allRecords')}`,
                run: () => viewsControl.select(null)
              },
              ...savedViews.views.map((v) => ({
                id: `view:${v.id}`,
                label: `${t('view')}: ${v.name}`,
                run: () => viewsControl.select(v.id)
              }))
            ]
          : [])
      ]}
      flush
    >
      {canFilter && paneOpen && (
        <FilterPane
          resource={resource}
          filters={filters}
          onChange={setFilters}
          onClose={() => setPaneOpen(false)}
          views={viewsControl}
        />
      )}
      <Stack gap="sm" className={classes.content}>
        {list.isError && <ErrorAlert error={list.error} onRetry={() => list.refetch()} />}

        {editor.problems.length > 0 && (
          <Alert color="red" title={t('rowsNotSaved')} p="xs">
            <Stack gap={4}>
              {editor.problems.map(([key, p]) => (
                <Group key={key} gap="xs" wrap="nowrap" justify="space-between">
                  <Text size="sm">
                    <b>{p.title}</b>
                    {' - '}
                    {[
                      ...Object.entries(p.fields).map(
                        ([name, m]) =>
                          `${resource.fields.find((f) => f.name === name)?.label ?? name}: ${m}`
                      ),
                      p.message
                    ]
                      .filter(Boolean)
                      .join(' - ')}
                  </Text>
                  {editor.conflicts.some(([k]) => k === key) && (
                    <Group gap="xs" wrap="nowrap">
                      <Button variant="default" onClick={() => editor.reload(key)}>
                        {t('reload')}
                      </Button>
                      <Button variant="default" onClick={() => editor.keepMine(key)}>
                        {t('keepMine')}
                      </Button>
                    </Group>
                  )}
                </Group>
              ))}
            </Stack>
          </Alert>
        )}

        <ListEditorContext.Provider value={editor}>
          <DataGrid
            table={table}
            loading={list.isFetching}
            emptyText={t('noRows')}
            sortHint={t('sortHint')}
            onRowOpen={(row) => open(row.original[resource.idField] as Id)}
            onActiveCellChange={onActiveCellChange}
            onColumnMove={(id, target, side) =>
              patchLayout({ order: moveColumn(order, id, target, side) })
            }
            editing={editor.editing}
            rowState={(row) =>
              editor.isSaving(row.original)
                ? 'saving'
                : editor.problem(row.original)
                  ? 'error'
                  : editor.isDirty(row.original)
                    ? 'dirty'
                    : undefined
            }
          />
        </ListEditorContext.Provider>

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
              data={PAGE_SIZES.map(String)}
              value={String(limit)}
              allowDeselect={false}
              onChange={(v) => v && patchLayout({ pageSize: Number(v) })}
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
        <ConfirmDialog
          opened={blocker.status === 'blocked'}
          title={t('discardTitle')}
          confirmLabel={t('discard')}
          danger
          onConfirm={() => blocker.proceed?.()}
          onCancel={() => blocker.reset?.()}
        >
          {t('discardBody')}
        </ConfirmDialog>
      </Stack>
    </Page>
  )
}
