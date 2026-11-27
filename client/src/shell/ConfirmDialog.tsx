import { CommandLayer } from './CommandBar'
import { Button, Group, Modal, Text } from '@mantine/core'
import type { ReactNode } from 'react'
import { useText } from '../platform/useText'

/** A yes / no question. The wording comes from the caller (the server's, for actions). */
export function ConfirmDialog({
  opened,
  title,
  children,
  confirmLabel,
  danger,
  loading,
  onConfirm,
  onCancel
}: {
  opened: boolean
  title: string
  children?: ReactNode
  confirmLabel?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}): React.JSX.Element {
  const t = useText()
  return (
    <Modal opened={opened} onClose={onCancel} title={title} centered size="sm">
      {/* No page shortcut may act under this question. */}
      {opened && <CommandLayer actions={[]} level="modal" />}
      {typeof children === 'string' ? <Text size="sm">{children}</Text> : children}
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onCancel} disabled={loading}>
          {t('cancel')}
        </Button>
        <Button
          color={danger ? 'red' : undefined}
          onClick={onConfirm}
          loading={loading}
          data-autofocus
        >
          {confirmLabel ?? t('confirm')}
        </Button>
      </Group>
    </Modal>
  )
}
