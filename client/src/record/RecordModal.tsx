import { Group, Modal, ScrollArea, Text } from '@mantine/core'
import { useCallback, useRef, useState } from 'react'
import type { Id, MetaResource } from '../api/types'
import { useText } from '../platform/useText'
import { ConfirmDialog } from '../shell/ConfirmDialog'
import { CommandLayer } from '../shell/CommandBar'
import { ActionBar } from '../shell/Page'
import classes from './RecordModal.module.css'
import { RecordView } from './RecordView'

/** A record of a "modal" resource, opened over its list. */
export function RecordModal({
  resource,
  id,
  onOpen,
  onClose
}: {
  resource: MetaResource
  id: Id | null
  onOpen: (id: Id) => void
  onClose: () => void
}): React.JSX.Element {
  const t = useText()
  const dirty = useRef(false)
  const [asking, setAsking] = useState(false)
  const onDirtyChange = useCallback((d: boolean) => {
    dirty.current = d
  }, [])
  const requestClose = (): void => (dirty.current ? setAsking(true) : onClose())

  return (
    <>
      <RecordView
        resource={resource}
        id={id}
        onOpen={onOpen}
        onClose={onClose}
        onDirtyChange={onDirtyChange}
        renderFrame={({ title, badge, actions, body }) => (
          <Modal
            opened
            onClose={requestClose}
            title={
              <Group gap="xs" wrap="nowrap">
                <Text fw={600} size="lg">
                  {title}
                </Text>
                {badge}
              </Group>
            }
            size="xl"
            scrollAreaComponent={ScrollArea.Autosize}
            closeOnEscape={!asking}
          >
            <CommandLayer actions={actions} level="modal" />
            {/* The same action bar as a record page, at the top. */}
            {actions.some((g) => g.length > 0) && (
              <Group mb="md" pb={6} className={classes.bar}>
                <ActionBar groups={actions} />
              </Group>
            )}
            {body}
          </Modal>
        )}
      />
      <ConfirmDialog
        opened={asking}
        title={t('discardTitle')}
        confirmLabel={t('discard')}
        danger
        onConfirm={() => {
          setAsking(false)
          onClose()
        }}
        onCancel={() => setAsking(false)}
      >
        {t('discardBody')}
      </ConfirmDialog>
    </>
  )
}
