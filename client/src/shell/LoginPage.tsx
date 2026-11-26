import { Button, Paper, PasswordInput, Stack, TextInput, Title } from '@mantine/core'
import { useState } from 'react'
import type { ApiError } from '../api/client'
import { useSession } from '../platform/session'
import { useText } from '../platform/useText'
import { ErrorAlert } from './ErrorAlert'
import { Splash } from './Splash'

export function LoginPage(): React.JSX.Element {
  const t = useText()
  const { login } = useSession()
  const [userNo, setUserNo] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const failure = await login(userNo.trim(), password)
      if (failure) {
        setError(failure)
        setPassword('')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Splash>
      <Paper withBorder shadow="sm" p="xl" w={380}>
        <form onSubmit={submit}>
          <Stack>
            <Title order={2}>{t('appName')}</Title>
            {/* The server's message, in the language it chose from the OS's. */}
            {error && <ErrorAlert error={error} />}
            <TextInput
              label={t('userNo')}
              value={userNo}
              onChange={(e) => setUserNo(e.currentTarget.value)}
              autoFocus
              autoComplete="username"
              required
            />
            <PasswordInput
              label={t('password')}
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              autoComplete="current-password"
              required
            />
            <Button type="submit" loading={busy} disabled={!userNo.trim() || !password}>
              {t('signIn')}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Splash>
  )
}
