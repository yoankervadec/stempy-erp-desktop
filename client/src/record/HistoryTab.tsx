import { Button, Center, Group, Loader, Paper, Stack, Table, Text } from '@mantine/core'
import { useInfiniteQuery } from '@tanstack/react-query'
import { getHistory } from '../api/records'
import type {
  CollectionChange,
  FieldChange,
  HistoryEntry,
  Id,
  MaskedChange,
  MetaField,
  MetaResource
} from '../api/types'
import { isMaskedChange } from '../api/types'
import { formatInstant, formatValue } from '../platform/format'
import { useLanguage } from '../platform/meta'
import { useText } from '../platform/useText'
import { ErrorAlert } from '../shell/ErrorAlert'

const PAGE = 20

type Change = FieldChange | MaskedChange | CollectionChange

function isFieldChange(c: Change): c is FieldChange {
  return typeof c === 'object' && c !== null && 'old' in c && 'new' in c
}

function Entry({
  entry,
  fields
}: {
  entry: HistoryEntry
  fields: Map<string, MetaField>
}): React.JSX.Element {
  const t = useText()
  const language = useLanguage()
  const show = (name: string, v: unknown): string => {
    if (v === null || v === undefined) return t('emptyValue')
    const f = fields.get(name)
    // Without its field's metadata (a field gone from /meta), the raw value.
    return f && f.type !== 'reference' ? formatValue(f, v, undefined, language) : String(v)
  }
  const changes = Object.entries(entry.changes ?? {}) as [string, Change][]
  return (
    <Paper withBorder p="sm">
      <Group justify="space-between" mb={changes.length ? 'xs' : 0}>
        <Text fw={600} size="sm">
          {entry.actionLabel ?? entry.action}
        </Text>
        <Text size="xs" c="dimmed">
          {formatInstant(entry.occurredAt, language)} - {entry.user.name} ({entry.user.userNo})
        </Text>
      </Group>
      {changes.length > 0 && (
        <Table verticalSpacing={2} fz="sm">
          <Table.Tbody>
            {changes.map(([name, change]) => {
              const label = entry.labels?.[name] ?? fields.get(name)?.label ?? name
              let what: string
              if (isMaskedChange(change)) {
                what = t('hiddenValue')
              } else if (isFieldChange(change)) {
                what = `${show(name, change.old)}  ->  ${show(name, change.new)}`
              } else {
                const c = change as CollectionChange
                what = [
                  c.added?.length && t('linesAdded', { n: c.added.length }),
                  c.changed &&
                    Object.keys(c.changed).length &&
                    t('linesChanged', { n: Object.keys(c.changed).length }),
                  c.removed?.length && t('linesRemoved', { n: c.removed.length })
                ]
                  .filter(Boolean)
                  .join(', ')
              }
              return (
                <Table.Tr key={name}>
                  <Table.Td w="30%" c="dimmed">
                    {label}
                  </Table.Td>
                  <Table.Td style={{ whiteSpace: 'pre-wrap' }}>{what}</Table.Td>
                </Table.Tr>
              )
            })}
          </Table.Tbody>
        </Table>
      )}
      {entry.requestId && (
        <Text size="xs" c="dimmed" mt={4} style={{ userSelect: 'text' }}>
          {t('requestId')}: {entry.requestId}
        </Text>
      )}
    </Paper>
  )
}

/** Who changed what, newest first. */
export function HistoryTab({
  resource,
  id
}: {
  resource: MetaResource
  id: Id
}): React.JSX.Element {
  const t = useText()
  const history = useInfiniteQuery({
    queryKey: ['history', resource.key, id],
    queryFn: ({ pageParam }) => getHistory(resource, id, { limit: PAGE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page.hasMore ? last.page.offset + last.page.limit : undefined)
  })
  const fields = new Map(resource.fields.map((f) => [f.name, f]))

  if (history.isError) return <ErrorAlert error={history.error} onRetry={() => history.refetch()} />
  if (!history.data) {
    return (
      <Center py="lg">
        <Loader size="sm" />
      </Center>
    )
  }
  const entries = history.data.pages.flatMap((p) => p.data)
  return (
    <Stack gap="xs">
      {entries.length === 0 && <Text c="dimmed">{t('noHistory')}</Text>}
      {entries.map((e) => (
        <Entry key={e.id} entry={e} fields={fields} />
      ))}
      {history.hasNextPage && (
        <Button
          variant="default"
          size="xs"
          onClick={() => history.fetchNextPage()}
          loading={history.isFetchingNextPage}
        >
          {t('loadMore')}
        </Button>
      )}
    </Stack>
  )
}
