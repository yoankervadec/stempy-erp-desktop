import {
  Alert,
  Badge,
  Button,
  Center,
  Group,
  List,
  Loader,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Title
} from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { ActionDialog, type ActionResult } from '../actions/ActionDialog'
import { ApiError } from '../api/client'
import {
  calculateRecord,
  createRecord,
  deleteRecord,
  getNewRecord,
  getRecord,
  recordQueryKey,
  updateRecord
} from '../api/records'
import type { CalculateResponse, FieldError, Id, MetaAction, MetaResource, Row } from '../api/types'
import { isNewRecordMeta } from '../api/types'
import { FieldInput } from '../fields/FieldInput'
import { formatValue } from '../platform/format'
import { DELETE_HOTKEY } from '../platform/hotkeys'
import { useLanguage } from '../platform/meta'
import { useText } from '../platform/useText'
import { ConfirmDialog } from '../shell/ConfirmDialog'
import type { ActionGroups, PageAction } from '../shell/Page'
import { ErrorAlert } from '../shell/ErrorAlert'
import { ChildList } from './ChildList'
import { CollectionGrid } from './CollectionGrid'
import { HistoryTab } from './HistoryTab'
import {
  canEditCollection,
  canEditField,
  createBody,
  formPath,
  inlineCollections,
  isNew,
  patchBody,
  sectionFields,
  toFormValues,
  type FormValues
} from './values'

export interface RecordViewProps {
  resource: MetaResource
  /** null: a new record (from GET /new). */
  id: Id | null
  /** Show another stored record of this resource here (after a create, a reversal). */
  onOpen: (id: Id) => void
  /** Leave: close the modal, or go back to the list. */
  onClose: () => void
  /** Told when the form has unsaved changes, so closing can ask first. */
  onDirtyChange?: (dirty: boolean) => void
  /** Where the actions go: the modal's footer or the page's header. */
  renderFrame: (parts: {
    title: string
    badge?: ReactNode
    actions: ActionGroups
    body: ReactNode
  }) => React.JSX.Element
}

/** Loads the record (or the blank one), then hands it to the editor. */
export function RecordView(props: RecordViewProps): React.JSX.Element {
  const { resource, id } = props
  const record = useQuery({
    queryKey: recordQueryKey(resource, id),
    queryFn: () => (id == null ? getNewRecord(resource) : getRecord(resource, id)),
    // A blank record is asked for each time: its defaults may depend on the day.
    gcTime: id == null ? 0 : undefined,
    staleTime: 0
  })
  if (record.isError) {
    return props.renderFrame({
      title: resource.labelOne,
      actions: [],
      body: <ErrorAlert error={record.error} onRetry={() => record.refetch()} />
    })
  }
  if (!record.data) {
    return props.renderFrame({
      title: resource.labelOne,
      actions: [],
      body: (
        <Center py="xl">
          <Loader />
        </Center>
      )
    })
  }
  return <RecordEditor key={`${resource.key}:${id ?? 'new'}`} {...props} loaded={record.data} />
}

function recordTitle(resource: MetaResource, row: Row, language: 'fr' | 'en'): string {
  const f = resource.fields.find((x) => x.name === resource.title)
  const v = row[resource.title]
  if (v === null || v === undefined || v === '') return ''
  return f ? formatValue(f, v, row, language) : String(v)
}

function RecordEditor({
  resource,
  id,
  loaded,
  onOpen,
  onClose,
  onDirtyChange,
  renderFrame
}: RecordViewProps & { loaded: Row }): React.JSX.Element {
  const t = useText()
  const language = useLanguage()
  const queryClient = useQueryClient()

  /** The record the form started from: as last read, saved, or reloaded. */
  const [base, setBase] = useState<Row>(loaded)
  const form = useForm<FormValues>({ defaultValues: toFormValues(resource, loaded) })
  const values = useWatch({ control: form.control }) as FormValues
  const creating = isNew(base)

  const [generalErrors, setGeneralErrors] = useState<FieldError[]>([])
  const [error, setError] = useState<unknown>(null)
  const [conflict, setConflict] = useState<Row | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [action, setAction] = useState<{ action: MetaAction; confirm: string | null } | null>(null)
  const [tab, setTab] = useState<string | null>('details')

  const headerFields = sectionFields(resource)
  const inline = inlineCollections(resource)
  const editableHeader = headerFields.some((f) => canEditField(base, f))
  const editableLines = inline.some((c) => canEditCollection(base, c))
  const editable = editableHeader || editableLines

  const patch = creating ? null : patchBody(resource, base, values)
  const dirty = creating ? form.formState.isDirty : !!patch?.changed

  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange])

  /** Start again from this row: what the server has now. */
  function rebase(row: Row): void {
    setBase(row)
    form.reset(toFormValues(resource, row))
    setGeneralErrors([])
    setError(null)
    setConflict(null)
    queryClient.setQueryData(recordQueryKey(resource, id), row)
  }

  /** Lists show the change; the record's history has a new entry. */
  function changed(): void {
    void queryClient.invalidateQueries({ queryKey: ['list', resource.key] })
    void queryClient.invalidateQueries({ queryKey: ['history', resource.key] })
    void queryClient.invalidateQueries({ queryKey: ['ref-options', resource.key] })
  }

  /** A failed write: field errors onto their inputs, a conflict offered, the rest in the alert. */
  function failed(e: unknown): void {
    if (!(e instanceof ApiError)) {
      setError(e)
      return
    }
    if (e.code === 'VERSION_CONFLICT' && e.problem.current) {
      setConflict(e.problem.current)
      return
    }
    const errors = e.problem.errors ?? []
    if (errors.length === 0) {
      setError(e)
      return
    }
    const unplaced: FieldError[] = []
    for (const fe of errors) {
      const path = formPath(fe.field)
      const top = path.split('.')[0]
      const onForm =
        headerFields.some((f) => f.name === path) ||
        (inline.some((c) => c.name === top) && path.includes('.'))
      if (onForm) form.setError(path, { type: fe.code, message: fe.message })
      else unplaced.push(fe)
    }
    setGeneralErrors(unplaced)
    if (unplaced.length > 0) setError(e)
  }

  async function save(): Promise<void> {
    setSaving(true)
    setError(null)
    setGeneralErrors([])
    form.clearErrors()
    try {
      if (creating) {
        const row = await createRecord(resource, createBody(resource, base, form.getValues()))
        changed()
        const newId = row[resource.idField] as Id
        queryClient.setQueryData(recordQueryKey(resource, newId), row)
        onDirtyChange?.(false)
        notifications.show({ color: 'green', message: t('saved') })
        onOpen(newId)
      } else if (patch?.changed) {
        const row = await updateRecord(resource, id!, patch.body)
        changed()
        rebase(row)
        notifications.show({ color: 'green', message: t('saved') })
      }
    } catch (e) {
      failed(e)
    } finally {
      setSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setDeleting(true)
    try {
      await deleteRecord(resource, id!, base[resource.versionField ?? 'version'] as number)
      changed()
      setConfirmDelete(false)
      onDirtyChange?.(false)
      notifications.show({ message: t('deleted') })
      onClose()
    } catch (e) {
      setConfirmDelete(false)
      failed(e)
    } finally {
      setDeleting(false)
    }
  }

  /** Keep what I changed, on top of the version the server has now. */
  function keepMine(current: Row): void {
    const mine = patchBody(resource, base, form.getValues()).body
    const merged = toFormValues(resource, current)
    const now = form.getValues()
    for (const key of Object.keys(mine)) {
      if (key !== resource.versionField) merged[key] = now[key]
    }
    setBase(current)
    form.reset(merged)
    setConflict(null)
    queryClient.setQueryData(recordQueryKey(resource, id), current)
  }

  function actionDone(result: ActionResult): void {
    setAction(null)
    changed()
    const body = result.body as Row | null
    const resultId = body?.[resource.idField]
    if (result.status === 201 && typeof resultId === 'number' && resultId !== id) {
      // The action made another record of this resource (a reversal): show it.
      queryClient.setQueryData(recordQueryKey(resource, resultId), body)
      onOpen(resultId)
    } else if (body && resultId === id && body._meta) {
      rebase(body)
    } else {
      void queryClient.invalidateQueries({ queryKey: recordQueryKey(resource, id) })
      if (id != null) void getRecord(resource, id).then(rebase, failed)
    }
  }

  // Documents: live totals from the server while the user edits (nothing saved).
  // Only documents with editable lines are calculated. Worked out inside the memo, from
  // its own inputs: a flag from outside makes the React Compiler give up on this component.
  const draft = useMemo(() => {
    const lines = inlineCollections(resource)
    if (!lines.some((c) => canEditCollection(base, c))) return null
    return creating ? createBody(resource, base, values) : patchBody(resource, base, values).body
  }, [creating, resource, base, values])
  const [debouncedDraft] = useDebouncedValue(draft, 400)
  const calc = useQuery<CalculateResponse>({
    queryKey: ['calculate', resource.key, id ?? 'new', debouncedDraft],
    queryFn: () => calculateRecord(resource, id, debouncedDraft!),
    enabled: debouncedDraft != null && dirty,
    placeholderData: (prev) => prev,
    retry: false,
    staleTime: Infinity
  })
  const computed = (dirty && calc.data?.document) || base
  // What read-only fields show: the server's values (recalculated while editing a document).
  const shown = useMemo(() => toFormValues(resource, computed), [resource, computed])

  const recordActions = useMemo(() => {
    if (creating || isNewRecordMeta(base._meta) || !base._meta) return []
    return base._meta.actions
      .map((a) => ({
        action: resource.actions.find((x) => x.scope === 'record' && x.name === a.name),
        confirm: a.confirm
      }))
      .filter((a): a is { action: MetaAction; confirm: string | null } => !!a.action)
  }, [base, creating, resource.actions])

  const meta = !creating && base._meta && !isNewRecordMeta(base._meta) ? base._meta : null
  const fieldError = (path: string): string | undefined =>
    form.getFieldState(path, form.formState).error?.message

  const titleText = creating ? '' : recordTitle(resource, base, language)
  const title = titleText ? `${resource.labelOne} ${titleText}` : resource.labelOne
  const badge = creating ? <Badge>{t('creating')}</Badge> : undefined

  const saveAction: PageAction = {
    key: 'save',
    label: t('save'),
    hotkey: 'mod+s',
    primary: true,
    loading: saving,
    disabled: !creating && !dirty,
    onClick: () => void save()
  }
  const cancelAction: PageAction = {
    key: 'cancel',
    label: t('cancel'),
    onClick: () => rebase(base)
  }
  const deleteAction: PageAction = {
    key: 'delete',
    label: t('delete'),
    hotkey: DELETE_HOTKEY,
    danger: true,
    disabled: dirty,
    title: dirty ? t('saveFirst') : undefined,
    onClick: () => setConfirmDelete(true)
  }
  const actions: ActionGroups = [
    editable ? (dirty && !creating ? [saveAction, cancelAction] : [saveAction]) : [],
    meta?.can.delete ? [deleteAction] : [],
    // The record's own actions, as /meta and _meta.actions name them.
    recordActions.map((a) => ({
      key: `action:${a.action.name}`,
      label: a.action.label,
      disabled: dirty,
      title: dirty ? t('saveFirst') : undefined,
      onClick: () => setAction(a)
    }))
  ]

  const summary = resource.layout.summary
    .map((name) => resource.fields.find((f) => f.name === name))
    .filter((f) => !!f)

  const details = (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      {/* Enter in a field saves. */}
      <button type="submit" hidden />
      <Stack gap="md">
        {conflict && (
          <Alert color="yellow" title={t('conflictTitle')}>
            <Text size="sm">{t('conflictBody')}</Text>
            <Group mt="sm" gap="xs">
              <Button size="xs" variant="default" onClick={() => rebase(conflict)}>
                {t('reload')}
              </Button>
              <Button size="xs" onClick={() => keepMine(conflict)}>
                {t('keepMine')}
              </Button>
            </Group>
          </Alert>
        )}
        {error != null && <ErrorAlert error={error} />}
        {generalErrors.length > 0 && error == null && (
          <Alert color="red">
            <List size="sm">
              {generalErrors.map((e) => (
                <List.Item key={e.field}>{e.message}</List.Item>
              ))}
            </List>
          </Alert>
        )}

        {resource.layout.sections.map((section) => {
          const fields = section.fields
            .map((name) => headerFields.find((f) => f.name === name))
            .filter((f) => !!f)
          if (fields.length === 0) return null
          return (
            <div key={section.name}>
              {resource.layout.sections.length > 1 && (
                <Title order={5} mb={4}>
                  {section.label}
                </Title>
              )}
              <SimpleGrid
                cols={{ base: 1, sm: Math.max(1, section.columns) }}
                spacing="sm"
                verticalSpacing="xs"
              >
                {fields.map((f) => {
                  const editableField = canEditField(base, f)
                  return (
                    <div
                      key={f.name}
                      style={f.format === 'multiline' ? { gridColumn: '1 / -1' } : undefined}
                    >
                      <Controller
                        control={form.control}
                        name={f.name}
                        render={({ field, fieldState }) => (
                          <FieldInput
                            field={f}
                            value={editableField ? field.value : shown[f.name]}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            readOnly={!editableField}
                            error={fieldState.error?.message}
                            row={computed}
                          />
                        )}
                      />
                    </div>
                  )
                })}
              </SimpleGrid>
            </div>
          )
        })}

        {resource.layout.collections.map((c) =>
          c.source === null ? (
            <CollectionGrid
              key={c.name}
              collection={c}
              control={form.control}
              row={base}
              calculated={dirty ? (calc.data?.document[c.name] as Row[] | undefined) : undefined}
              errorAt={fieldError}
            />
          ) : creating ? null : (
            <ChildList key={c.name} collection={c} parentId={id!} />
          )
        )}

        {summary.length > 0 && (
          <Group justify="flex-end" gap="xl">
            {summary.map((f) => (
              <Stack key={f.name} gap={0} align="flex-end">
                <Text size="xs" c="dimmed">
                  {f.label}
                </Text>
                <Text fw={700}>{formatValue(f, computed[f.name], computed, language)}</Text>
              </Stack>
            ))}
          </Group>
        )}

        {dirty && calc.data && calc.data.warnings.length > 0 && (
          <Alert color="yellow" title={t('warnings')}>
            <List size="sm">
              {calc.data.warnings.map((w) => (
                <List.Item key={`${w.field}:${w.code}`}>{w.message}</List.Item>
              ))}
            </List>
          </Alert>
        )}
      </Stack>
    </form>
  )

  const historyTab =
    !creating && resource.can.history && resource.layout.tabs.find((x) => x.name === 'history')

  const body = (
    <>
      {historyTab ? (
        <Tabs value={tab} onChange={setTab} keepMounted={false}>
          <Tabs.List mb="md">
            <Tabs.Tab value="details">{t('details')}</Tabs.Tab>
            <Tabs.Tab value="history">{historyTab.label}</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="details">{details}</Tabs.Panel>
          <Tabs.Panel value="history">
            <HistoryTab resource={resource} id={id!} />
          </Tabs.Panel>
        </Tabs>
      ) : (
        details
      )}
      <ConfirmDialog
        opened={confirmDelete}
        title={t('deleteTitle')}
        danger
        confirmLabel={t('delete')}
        loading={deleting}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(false)}
      >
        {t('deleteBody', { name: titleText || resource.labelOne })}
      </ConfirmDialog>
      {action && (
        <ActionDialog
          action={action.action}
          recordId={id}
          confirmText={action.confirm}
          onClose={() => setAction(null)}
          onDone={actionDone}
        />
      )}
    </>
  )

  return renderFrame({ title, badge, actions, body })
}
