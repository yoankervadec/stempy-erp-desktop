import { Alert, Stack, Text, Title } from '@mantine/core'
import { useParams } from '@tanstack/react-router'
import { useResource } from '../platform/meta'
import { useText } from '../platform/useText'

/** One resource's list. Placeholder until the generic list screen is built. */
export function ResourcePage(): React.JSX.Element {
  const t = useText()
  const { resourceKey } = useParams({ from: '/r/$resourceKey' })
  const resource = useResource(resourceKey)
  if (!resource) return <Alert color="gray">{t('notInMeta')}</Alert>
  return (
    <Stack gap="xs">
      <Title order={2}>{resource.label}</Title>
      <Text c="dimmed">{t('screenPending')}</Text>
    </Stack>
  )
}
