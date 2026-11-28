import {
  Alert,
  Button,
  Center,
  Checkbox,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  TextInput
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { getRolePermissions, listPermissions } from '../api/access'
import { ApiError } from '../api/client'
import { updateRecord } from '../api/records'
import type { Id, PermissionView, RolePermissions } from '../api/types'
import { isNewRecordMeta } from '../api/types'
import { useText } from '../platform/useText'
import { ErrorAlert } from '../shell/ErrorAlert'
import type { RecordPanelProps } from './registry'

/**
 * The permissions a role gives: every declared permission, ticked when the
 * role has it. Saved on its own with the version its read gave, so it never
 * mixes with the role's form. Whether the user may give a permission is the
 * server's call (403 CANNOT_GRANT names the missing ones).
 */
export function RolePermissionsPanel({
  resource,
  record,
  dirty,
  onChanged
}: RecordPanelProps): React.JSX.Element {
  const t = useText()
  const id = record[resource.idField] as Id
  const role = useQuery({
    queryKey: ['role-permissions', resource.key, id],
    queryFn: () => getRolePermissions(resource.path, id),
    staleTime: 0
  })
  const declared = useQuery({
    queryKey: ['access-permissions'],
    queryFn: listPermissions,
    staleTime: 5 * 60_000
  })

  /** What the user ticked; null: nothing changed, show the role's. */
  const [picked, setPicked] = useState<Set<string> | null>(null)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [conflict, setConflict] = useState(false)

  const stored = useMemo(
    () => new Set((role.data?.permissions ?? []).map((p) => p.name)),
    [role.data]
  )
  const selected = picked ?? stored

  /** Every declared permission, then the role's stored ones the code no longer declares. */
  const rows = useMemo((): PermissionView[] => {
    const all = declared.data ?? []
    const names = new Set(all.map((p) => p.name))
    const stale = (role.data?.permissions ?? []).filter((p) => !names.has(p.name))
    return [...all, ...stale]
  }, [declared.data, role.data])

  const needle = search.trim().toLowerCase()
  const shown = needle
    ? rows.filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          (p.description ?? '').toLowerCase().includes(needle)
      )
    : rows

  if (role.isError || declared.isError) {
    return (
      <ErrorAlert
        error={role.error ?? declared.error}
        onRetry={() => {
          void role.refetch()
          void declared.refetch()
        }}
      />
    )
  }
  if (!role.data || !declared.data) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    )
  }

  const meta = record._meta && !isNewRecordMeta(record._meta) ? record._meta : null
  const allPermissions = role.data.allPermissions
  const canEdit = !!meta?.can.update && !allPermissions && !dirty
  const changed =
    picked != null && (picked.size !== stored.size || [...picked].some((n) => !stored.has(n)))

  function toggle(name: string, on: boolean): void {
    const next = new Set(selected)
    if (on) next.add(name)
    else next.delete(name)
    setPicked(next)
  }

  async function save(current: RolePermissions): Promise<void> {
    setSaving(true)
    setError(null)
    setConflict(false)
    try {
      // Sorted for a stable body; the server keeps a set.
      await updateRecord(resource, id, {
        version: current.version,
        permissions: [...selected].sort()
      })
      setPicked(null)
      await role.refetch()
      onChanged()
      notifications.show({ color: 'green', message: t('saved') })
    } catch (e) {
      if (e instanceof ApiError && e.code === 'VERSION_CONFLICT') {
        setConflict(true)
        void role.refetch()
      } else {
        setError(e)
      }
    } finally {
      setSaving(false)
    }
  }

  const allLabel = resource.fields.find((f) => f.name === 'allPermissions')?.label

  return (
    <Stack gap="sm">
      {allPermissions && allLabel && <Alert color="blue">{allLabel}</Alert>}
      {dirty && !allPermissions && meta?.can.update && (
        <Alert color="yellow">{t('saveFirst')}</Alert>
      )}
      {conflict && (
        <Alert color="yellow" title={t('conflictTitle')}>
          <Text size="sm">{t('conflictBody')}</Text>
          <Group mt="sm" gap="xs">
            <Button
              size="xs"
              variant="default"
              onClick={() => {
                setPicked(null)
                setConflict(false)
              }}
            >
              {t('reload')}
            </Button>
            <Button size="xs" onClick={() => setConflict(false)}>
              {t('keepMine')}
            </Button>
          </Group>
        </Alert>
      )}
      {error != null && <ErrorAlert error={error} />}

      <Group justify="space-between" wrap="nowrap">
        <TextInput
          size="xs"
          placeholder={t('search')}
          aria-label={t('search')}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          w={280}
        />
        <Group gap="xs" wrap="nowrap">
          <Text size="xs" c="dimmed">
            {t('permissionsCount', { n: selected.size, total: declared.data.length })}
          </Text>
          {canEdit && changed && (
            <>
              <Button size="xs" variant="default" onClick={() => setPicked(null)} disabled={saving}>
                {t('cancel')}
              </Button>
              <Button size="xs" loading={saving} onClick={() => void save(role.data)}>
                {t('save')}
              </Button>
            </>
          )}
        </Group>
      </Group>

      <Table withTableBorder withColumnBorders striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={32} />
            <Table.Th>{t('permission')}</Table.Th>
            <Table.Th>{t('description')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {shown.map((p) => (
            <Table.Tr key={p.name}>
              <Table.Td>
                <Checkbox
                  size="xs"
                  aria-label={p.name}
                  checked={allPermissions || selected.has(p.name)}
                  disabled={!canEdit}
                  onChange={(e) => toggle(p.name, e.currentTarget.checked)}
                />
              </Table.Td>
              <Table.Td>
                <Text size="xs" ff="monospace">
                  {p.name}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="xs" c={p.declared ? undefined : 'red'}>
                  {p.declared ? p.description : t('permissionNotDeclared')}
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
          {shown.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={3}>
                <Text size="xs" c="dimmed">
                  {t('nothingMatches')}
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </Stack>
  )
}
