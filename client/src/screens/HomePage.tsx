import { Stack, Text, Title } from '@mantine/core'
import { useSessionInfo } from '../platform/session'
import { useText } from '../platform/useText'

export function HomePage(): React.JSX.Element {
  const t = useText()
  const info = useSessionInfo()
  return (
    <Stack gap="xs">
      <Title order={2}>{t('welcome', { name: info.user.name })}</Title>
      <Text c="dimmed">{t('welcomeHint')}</Text>
    </Stack>
  )
}
