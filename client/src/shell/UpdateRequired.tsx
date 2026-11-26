import { Button, Paper, Stack, Text, Title } from '@mantine/core'
import { SUPPORTED_API_VERSION } from '../api/types'
import { useSession } from '../platform/session'
import { useText } from '../platform/useText'
import { Splash } from './Splash'

/** The server speaks a newer API than this build: nothing else is shown. */
export function UpdateRequired({ serverVersion }: { serverVersion: number }): React.JSX.Element {
  const t = useText()
  const { logout } = useSession()
  return (
    <Splash>
      <Paper withBorder p="xl" maw={480}>
        <Stack>
          <Title order={3}>{t('updateRequiredTitle')}</Title>
          <Text>
            {t('updateRequiredBody', { server: serverVersion, client: SUPPORTED_API_VERSION })}
          </Text>
          <Button variant="default" onClick={() => logout()}>
            {t('signOut')}
          </Button>
        </Stack>
      </Paper>
    </Splash>
  )
}
