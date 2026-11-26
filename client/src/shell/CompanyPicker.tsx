import { Button, Paper, Stack, Text, Title } from '@mantine/core'
import { useSession, useSessionInfo } from '../platform/session'
import { useText } from '../platform/useText'
import { Splash } from './Splash'

/** Several companies and no default: every request needs X-Company-Id, so one is chosen first. */
export function CompanyPicker(): React.JSX.Element {
  const t = useText()
  const { setCompany, logout } = useSession()
  const info = useSessionInfo()
  return (
    <Splash>
      <Paper withBorder shadow="sm" p="xl" w={380}>
        <Stack>
          <Title order={3}>{t('chooseCompany')}</Title>
          {info.companies.map((c) => (
            <Button
              key={c.id}
              variant="default"
              justify="space-between"
              onClick={() => setCompany(c.id)}
            >
              <Text fw={600}>{c.code}</Text>
              {c.description && (
                <Text size="sm" c="dimmed" ml="sm">
                  {c.description}
                </Text>
              )}
            </Button>
          ))}
          <Button variant="subtle" onClick={() => logout()}>
            {t('signOut')}
          </Button>
        </Stack>
      </Paper>
    </Splash>
  )
}
