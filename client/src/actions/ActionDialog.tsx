import { Alert, Button, Group, Modal, Stack, Text } from '@mantine/core'
import { useState } from 'react'
import { ApiError } from '../api/client'
import { runAction } from '../api/records'
import type { Id, MetaAction } from '../api/types'
import { FieldInput } from '../fields/FieldInput'
import { useText } from '../platform/useText'
import { toInput, toWire } from '../record/values'
import { ErrorAlert } from '../shell/ErrorAlert'

export interface ActionResult {
  status: number
  body: unknown
}

/**
 * Runs one action (reverse, close...): its parameters as a form, its question
 * as the server worded it for this record. Field errors land on the inputs.
 */
export function ActionDialog({
  action,
  recordId,
  confirmText,
  onClose,
  onDone
}: {
  action: MetaAction
  recordId: Id | null
  /** From the record's _meta.actions: already in the user's language, with its values. */
  confirmText: string | null
  onClose: () => void
  onDone: (result: ActionResult) => void
}): React.JSX.Element {
  const t = useText()
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(action.params.map((p) => [p.name, toInput(p, null)]))
  )
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)

  async function submit(): Promise<void> {
    setBusy(true)
    setError(null)
    setFieldErrors({})
    const body: Record<string, unknown> = {}
    for (const p of action.params) {
      const w = toWire(p, values[p.name])
      if (w !== null) body[p.name] = w
    }
    try {
      onDone(await runAction(action, recordId, body))
    } catch (e) {
      if (e instanceof ApiError && e.problem.errors?.length) {
        const known = new Set(action.params.map((p) => p.name))
        const mine = e.problem.errors.filter((x) => known.has(x.field))
        setFieldErrors(Object.fromEntries(mine.map((x) => [x.field, x.message])))
        // Problems with no input to show them on stay in the alert.
        if (mine.length < e.problem.errors.length) setError(e)
      } else {
        setError(e)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal opened onClose={onClose} title={action.label} centered size="md">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <Stack>
          {confirmText && <Alert color="yellow">{confirmText}</Alert>}
          {action.params.map((p) => (
            <FieldInput
              key={p.name}
              field={p}
              value={values[p.name]}
              error={fieldErrors[p.name]}
              onChange={(v) => setValues((old) => ({ ...old, [p.name]: v }))}
            />
          ))}
          {action.params.length === 0 && !confirmText && <Text size="sm">{action.label}</Text>}
          {error != null && <ErrorAlert error={error} />}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose} disabled={busy}>
              {t('cancel')}
            </Button>
            <Button type="submit" loading={busy} data-autofocus>
              {action.label}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
