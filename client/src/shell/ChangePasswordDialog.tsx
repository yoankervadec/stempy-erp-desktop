import { Button, Group, Modal, PasswordInput, Stack } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useState } from 'react'
import { changeOwnPassword } from '../api/access'
import { ApiError } from '../api/client'
import { useText } from '../platform/useText'
import { CommandLayer } from './CommandBar'
import { ErrorAlert } from './ErrorAlert'

type Field = 'currentPassword' | 'newPassword'
const FIELDS: readonly string[] = ['currentPassword', 'newPassword'] satisfies Field[]

/**
 * POST /auth/me/password. The server checks the current password, the length
 * and that it differs (field errors land on the inputs); this session stays
 * open and the user's others end. The second new-password box only catches a
 * typo before sending.
 */
export function ChangePasswordDialog({ onClose }: { onClose: () => void }): React.JSX.Element {
  const t = useText()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({})
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const mismatch = again !== '' && again !== next

  async function submit(): Promise<void> {
    if (mismatch) return
    setBusy(true)
    setError(null)
    setFieldErrors({})
    try {
      await changeOwnPassword({ currentPassword: current, newPassword: next })
      notifications.show({ color: 'green', message: t('passwordChanged') })
      onClose()
    } catch (e) {
      const errors = e instanceof ApiError ? (e.problem.errors ?? []) : []
      const mine = errors.filter((x) => FIELDS.includes(x.field))
      setFieldErrors(Object.fromEntries(mine.map((x) => [x.field, x.message])))
      if (mine.length < errors.length || errors.length === 0) setError(e)
      if (mine.some((x) => x.field === 'currentPassword')) setCurrent('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal opened onClose={onClose} title={t('changePassword')} centered size="sm">
      <CommandLayer actions={[]} level="modal" />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <Stack>
          <PasswordInput
            label={t('currentPassword')}
            value={current}
            onChange={(e) => setCurrent(e.currentTarget.value)}
            error={fieldErrors.currentPassword}
            autoComplete="current-password"
            required
            data-autofocus
          />
          <PasswordInput
            label={t('newPassword')}
            value={next}
            onChange={(e) => setNext(e.currentTarget.value)}
            error={fieldErrors.newPassword}
            autoComplete="new-password"
            required
          />
          <PasswordInput
            label={t('confirmNewPassword')}
            value={again}
            onChange={(e) => setAgain(e.currentTarget.value)}
            error={mismatch ? t('passwordsDiffer') : undefined}
            autoComplete="new-password"
            required
          />
          {error != null && <ErrorAlert error={error} />}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose} disabled={busy}>
              {t('cancel')}
            </Button>
            <Button type="submit" loading={busy} disabled={!current || !next || again !== next}>
              {t('changePassword')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
