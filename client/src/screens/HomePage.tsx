import { Text } from '@mantine/core'
import { useSessionInfo } from '../platform/session'
import { useText } from '../platform/useText'
import { Page } from '../shell/Page'

export function HomePage(): React.JSX.Element {
  const t = useText()
  const info = useSessionInfo()
  return (
    <Page title={t('welcome', { name: info.user.name })}>
      <Text c="dimmed">{t('welcomeHint')}</Text>
    </Page>
  )
}
