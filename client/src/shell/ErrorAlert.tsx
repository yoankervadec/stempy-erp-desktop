import { Alert, Button, Code, Group, List, Text } from '@mantine/core'
import { ApiError } from '../api/client'
import { useText } from '../platform/useText'

/**
 * Shows a failed call: the server's translated title and detail, and the
 * request id, so the problem can be found in the server log.
 */
export function ErrorAlert({
  error,
  onRetry
}: {
  error: unknown
  onRetry?: () => void
}): React.JSX.Element {
  const t = useText()
  let title: string
  let detail: string | undefined
  let requestId: string | undefined
  let fieldErrors: { field: string; message: string }[] = []
  if (error instanceof ApiError) {
    const p = error.problem
    title = p.code === 'NETWORK_ERROR' ? t('serverUnreachable') : p.title
    detail = p.detail
    requestId = p.requestId
    fieldErrors = p.errors ?? []
  } else {
    title = error instanceof Error ? error.message : String(error)
  }
  return (
    <Alert color="red" title={title}>
      {detail && <Text size="sm">{detail}</Text>}
      {fieldErrors.length > 0 && (
        <List size="sm" mt={4}>
          {fieldErrors.map((e) => (
            <List.Item key={e.field}>
              <Code>{e.field}</Code> {e.message}
            </List.Item>
          ))}
        </List>
      )}
      {requestId && (
        <Text size="xs" c="dimmed" mt={4} style={{ userSelect: 'text' }}>
          {t('requestId')}: {requestId}
        </Text>
      )}
      {onRetry && (
        <Group mt="sm">
          <Button size="xs" variant="light" color="red" onClick={onRetry}>
            {t('retry')}
          </Button>
        </Group>
      )}
    </Alert>
  )
}
