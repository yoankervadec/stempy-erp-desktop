import { Center, Loader, Stack, Text } from '@mantine/core'
import type { ReactNode } from 'react'
import { useText } from '../platform/useText'

/** Full-window centre: a loader, or whatever is passed (an error, a form). */
export function Splash({ children }: { children?: ReactNode }): React.JSX.Element {
  const t = useText()
  return (
    <Center h="100vh" p="md">
      {children ?? (
        <Stack align="center" gap="xs">
          <Loader />
          <Text c="dimmed" size="sm">
            {t('loading')}
          </Text>
        </Stack>
      )}
    </Center>
  )
}
