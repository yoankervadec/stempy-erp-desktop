import { Group, Modal, ScrollArea } from '@mantine/core'
import { useCallback, useRef, useState } from 'react'
import type { Id, MetaResource } from '../api/types'
import { useText } from '../platform/useText'
import { ConfirmDialog } from '../shell/ConfirmDialog'
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
        renderFrame={({ title, buttons, body }) => (
          <Modal
            opened
            onClose={requestClose}
            title={title}
            size="xl"
            scrollAreaComponent={ScrollArea.Autosize}
            closeOnEscape={!asking}
          >
            {body}
            <Group justify="flex-end" mt="lg">
              {buttons}
            </Group>
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
