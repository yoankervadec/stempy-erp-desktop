import {
  ActionIcon,
  Button,
  Center,
  Checkbox,
  Group,
  Loader,
  Modal,
  MultiSelect,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { listMembers, listPermissions, putMember } from '../api/access'
import { queryList } from '../api/query'
import type { Member, MemberPut, MetaScreen, OverrideEffect, RefTitle } from '../api/types'
import { ReferencePicker } from '../fields/ReferencePicker'
import { screenPageId } from '../platform/menu'
import { useResource } from '../platform/meta'
import { useText } from '../platform/useText'
import { CommandLayer } from '../shell/CommandBar'
import { ErrorAlert } from '../shell/ErrorAlert'
import { Page } from '../shell/Page'

/**
 * The company's members (screen "member", ARCHITECTURE 23.12): who may work in
 * the request's company, with which roles and permission exceptions. Every word
 * is the screen's (`texts`, `values.effect`); `can.manage` allows changes. The
 * server checks each change again (CANNOT_GRANT, LAST_ACCESS_MANAGER...).
 */
export function MembersScreen({ screen }: { screen: MetaScreen }): React.JSX.Element {
  const t = useText()
  const userResource = useResource('user')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<Member | null>(null)
  const [adding, setAdding] = useState(false)
  const members = useQuery({
    queryKey: ['members', screen.path],
    queryFn: () => listMembers(screen.path),
    staleTime: 0
  })
  const manage = screen.can.manage === true
  const tx = screen.texts

  const needle = search.trim().toLowerCase()
  const shown = (members.data ?? []).filter(
    (m) =>
      !needle ||
      m.userNo.toLowerCase().includes(needle) ||
      m.name.toLowerCase().includes(needle) ||
      m.roles.some((r) => r.code.toLowerCase().includes(needle))
  )

  const yesNo = (b: boolean): string => (b ? t('yes') : t('no'))

  return (
    <Page
      title={screen.label}
      favourite={screenPageId(screen.key)}
      actions={[
        // Adding someone means picking a user account: only with users readable.
        manage && userResource?.can.read
          ? [{ key: 'add', label: t('add'), hotkey: 'mod+n', onClick: () => setAdding(true) }]
          : [],
        [
          {
            key: 'refresh',
            label: t('refresh'),
            hotkey: 'f5',
            onClick: () => void members.refetch()
          }
        ]
      ]}
      tools={
        <TextInput
          size="xs"
          placeholder={t('search')}
          aria-label={t('search')}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          w={220}
        />
      }
    >
      {members.isError ? (
        <ErrorAlert error={members.error} onRetry={() => void members.refetch()} />
      ) : !members.data ? (
        <Center py="xl">
          <Loader />
        </Center>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{tx.userNo}</Table.Th>
              <Table.Th>{tx.name}</Table.Th>
              <Table.Th>{tx.userEnabled}</Table.Th>
              <Table.Th>{tx.isEnabled}</Table.Th>
              <Table.Th>{tx.roles}</Table.Th>
              <Table.Th>{tx.overrides}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {shown.map((m) => (
              <Table.Tr
                key={m.userId}
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => setOpen(m)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setOpen(m)
                }}
              >
                <Table.Td>{m.userNo}</Table.Td>
                <Table.Td>{m.name}</Table.Td>
                <Table.Td>{yesNo(m.userEnabled)}</Table.Td>
                <Table.Td>{yesNo(m.isEnabled)}</Table.Td>
                <Table.Td>{m.roles.map((r) => r.code).join(', ')}</Table.Td>
                <Table.Td>{Object.keys(m.overrides).length || ''}</Table.Td>
              </Table.Tr>
            ))}
            {shown.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text size="xs" c="dimmed">
                    {needle ? t('nothingMatches') : t('noRows')}
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      )}

      {adding && (
        <AddMemberDialog
          screen={screen}
          onClose={() => setAdding(false)}
          onPick={(ref) => {
            setAdding(false)
            // Already a member: open them; else a blank membership, made on save.
            const known = members.data?.find((m) => m.userId === ref.id)
            setOpen(
              known ?? {
                userId: ref.id,
                userNo: ref.title,
                name: ref.subtitle ?? '',
                userEnabled: true,
                isEnabled: true,
                roles: [],
                overrides: {},
                permissions: []
              }
            )
          }}
        />
      )}
      {open && (
        <MemberDialog
          key={open.userId}
          screen={screen}
          member={open}
          isNew={!members.data?.some((m) => m.userId === open.userId)}
          onClose={() => setOpen(null)}
        />
      )}
    </Page>
  )
}

function AddMemberDialog({
  screen,
  onClose,
  onPick
}: {
  screen: MetaScreen
  onClose: () => void
  onPick: (ref: RefTitle) => void
}): React.JSX.Element {
  const t = useText()
  return (
    <Modal opened onClose={onClose} title={screen.label} centered size="sm">
      <CommandLayer actions={[]} level="modal" />
      <ReferencePicker
        resource="user"
        label={screen.texts.userNo}
        value={null}
        onChange={(_id, ref) => ref && onPick(ref)}
        data-autofocus
      />
      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onClose}>
          {t('cancel')}
        </Button>
      </Group>
    </Modal>
  )
}

/** Same keys and values, whatever the order. */
function sameOverrides(a: Record<string, string>, b: Record<string, string>): boolean {
  const ka = Object.keys(a)
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k])
}

function MemberDialog({
  screen,
  member: initial,
  isNew: startsNew,
  onClose
}: {
  screen: MetaScreen
  member: Member
  /** Not a member yet: the first save makes them one. */
  isNew: boolean
  onClose: () => void
}): React.JSX.Element {
  const t = useText()
  const queryClient = useQueryClient()
  const tx = screen.texts
  const effects = screen.values.effect ?? []
  const manage = screen.can.manage === true
  const roleResource = useResource('role')

  /** The member as the server last answered. */
  const [member, setMember] = useState(initial)
  const [isEnabled, setIsEnabled] = useState(initial.isEnabled)
  const [roles, setRoles] = useState(() => initial.roles.map((r) => r.code))
  const [overrides, setOverrides] = useState<Record<string, OverrideEffect>>(initial.overrides)
  const [adding, setAdding] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [saved, setSaved] = useState(false)
  const isNew = startsNew && !saved

  // Roles to choose from: the role list when the user may read it, else only
  // the member's own (they can be removed, not added).
  const roleRows = useQuery({
    queryKey: ['role-options'],
    queryFn: () =>
      queryList(roleResource!, { sort: roleResource!.defaultSort, page: { limit: 200 } }),
    enabled: manage && !!roleResource?.can.read,
    staleTime: 60_000
  })
  const permissions = useQuery({
    queryKey: ['access-permissions'],
    queryFn: listPermissions,
    enabled: manage,
    staleTime: 5 * 60_000
  })

  const roleOptions = useMemo(() => {
    const out = new Map<string, string>()
    for (const r of member.roles) out.set(r.code, `${r.code} - ${r.name}`)
    for (const row of roleRows.data?.data ?? []) {
      const code = String(row.code)
      out.set(code, `${code} - ${String(row.name ?? '')}`)
    }
    return [...out].map(([value, label]) => ({ value, label }))
  }, [member.roles, roleRows.data])

  const storedRoles = member.roles.map((r) => r.code)
  const rolesChanged =
    roles.length !== storedRoles.length || roles.some((c) => !storedRoles.includes(c))
  const overridesChanged = !sameOverrides(overrides, member.overrides)
  const enabledChanged = isEnabled !== member.isEnabled
  const changed = isNew || rolesChanged || overridesChanged || enabledChanged

  async function save(): Promise<void> {
    // Each part sent replaces what is stored: send only what changed.
    const body: MemberPut = {}
    if (isNew || enabledChanged) body.isEnabled = isEnabled
    if (isNew || rolesChanged) body.roles = roles
    if (overridesChanged) body.overrides = overrides
    setSaving(true)
    setError(null)
    try {
      const now = await putMember(screen.path, member.userId, body)
      setMember(now)
      setIsEnabled(now.isEnabled)
      setRoles(now.roles.map((r) => r.code))
      setOverrides(now.overrides)
      setSaved(true)
      void queryClient.invalidateQueries({ queryKey: ['members', screen.path] })
      // Stays open: the resulting permissions show what the change gave.
      notifications.show({ color: 'green', message: t('saved') })
    } catch (e) {
      setError(e)
    } finally {
      setSaving(false)
    }
  }

  const overrideNames = Object.keys(overrides).sort()
  const addable = (permissions.data ?? [])
    .filter((p) => !(p.name in overrides))
    .map((p) => ({ value: p.name, label: p.name }))

  return (
    <Modal opened onClose={onClose} title={`${screen.label} - ${member.userNo}`} centered size="xl">
      <CommandLayer
        actions={
          manage
            ? [
                [
                  {
                    key: 'save',
                    label: t('save'),
                    hotkey: 'mod+s',
                    disabled: !changed,
                    onClick: () => void save()
                  }
                ]
              ]
            : []
        }
        level="modal"
      />
      <Stack gap="sm">
        {error != null && <ErrorAlert error={error} />}
        <SimpleGrid cols={2} spacing="sm" verticalSpacing="xs">
          <TextInput label={tx.userNo} value={member.userNo} readOnly variant="filled" />
          <TextInput label={tx.name} value={member.name} readOnly variant="filled" />
          <Checkbox label={tx.userEnabled} checked={member.userEnabled} readOnly size="xs" />
          <Checkbox
            label={tx.isEnabled}
            checked={isEnabled}
            disabled={!manage}
            onChange={(e) => setIsEnabled(e.currentTarget.checked)}
            size="xs"
          />
        </SimpleGrid>

        <MultiSelect
          label={tx.roles}
          data={roleOptions}
          value={roles}
          onChange={setRoles}
          disabled={!manage}
          searchable
          clearable
        />

        <div>
          <Text size="xs" fw={700} mb={4}>
            {tx.overrides}
          </Text>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{tx.permission}</Table.Th>
                <Table.Th w={160}>{tx.effect}</Table.Th>
                {manage && <Table.Th w={32} />}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {overrideNames.map((name) => (
                <Table.Tr key={name}>
                  <Table.Td>
                    <Text size="xs" ff="monospace">
                      {name}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Select
                      aria-label={tx.effect}
                      data={effects}
                      value={overrides[name]}
                      disabled={!manage}
                      allowDeselect={false}
                      onChange={(v) =>
                        v && setOverrides((o) => ({ ...o, [name]: v as OverrideEffect }))
                      }
                    />
                  </Table.Td>
                  {manage && (
                    <Table.Td>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        aria-label={t('removeLine')}
                        title={t('removeLine')}
                        onClick={() =>
                          setOverrides((o) => {
                            const next = { ...o }
                            delete next[name]
                            return next
                          })
                        }
                      >
                        x
                      </ActionIcon>
                    </Table.Td>
                  )}
                </Table.Tr>
              ))}
              {manage && (
                <Table.Tr>
                  <Table.Td colSpan={3}>
                    <Select
                      aria-label={t('addLine')}
                      placeholder={t('addLine')}
                      data={addable}
                      value={adding}
                      searchable
                      onChange={(v) => {
                        if (!v || effects.length === 0) return
                        setOverrides((o) => ({ ...o, [v]: effects[0].value as OverrideEffect }))
                        setAdding(null)
                      }}
                    />
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </div>

        {!isNew && (
          <div>
            <Text size="xs" fw={700} mb={4}>
              {tx.permissions}
            </Text>
            {member.permissions.length === 0 ? (
              <Text size="xs" c="dimmed">
                {t('emptyValue')}
              </Text>
            ) : (
              <ScrollArea.Autosize mah={160}>
                <Text size="xs" ff="monospace" style={{ whiteSpace: 'pre-line' }}>
                  {member.permissions.join('\n')}
                </Text>
              </ScrollArea.Autosize>
            )}
          </div>
        )}

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} disabled={saving}>
            {manage ? t('cancel') : t('close')}
          </Button>
          {manage && (
            <Button loading={saving} disabled={!changed} onClick={() => void save()}>
              {t('save')}
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  )
}
