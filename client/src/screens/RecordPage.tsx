import { Alert } from '@mantine/core'
import { useBlocker, useNavigate, useParams } from '@tanstack/react-router'
import { useCallback, useRef } from 'react'
import { useResource } from '../platform/meta'
import { useText } from '../platform/useText'
import { RecordView } from '../record/RecordView'
import { ConfirmDialog } from '../shell/ConfirmDialog'
import { Page } from '../shell/Page'

/**
 * A record on its own page: resources whose presentation is "page" (documents,
 * records with tables), and any record opened from another one.
 */
export function RecordPage(): React.JSX.Element {
  const t = useText()
  const navigate = useNavigate()
  const { resourceKey, recordId } = useParams({ from: '/r/$resourceKey/$recordId' })
  const resource = useResource(resourceKey)
  const dirty = useRef(false)
  const onDirtyChange = useCallback((d: boolean) => {
    dirty.current = d
  }, [])
  const blocker = useBlocker({
    shouldBlockFn: () => dirty.current,
    // Default true: refuse every unload (closing the window, quitting), changes or not.
    enableBeforeUnload: () => dirty.current,
    withResolver: true
  })

  const id = recordId === 'new' ? null : /^\d+$/.test(recordId) ? Number(recordId) : undefined
  if (!resource || id === undefined || (id === null && !resource.can.create)) {
    return <Alert color="gray">{t('notInMeta')}</Alert>
  }

  const backToList = (): void => {
    void navigate({ to: '/r/$resourceKey', params: { resourceKey } })
  }

  return (
    <>
      <RecordView
        key={`${resourceKey}:${recordId}`}
        resource={resource}
        id={id}
        onDirtyChange={onDirtyChange}
        onOpen={(newId) =>
          void navigate({
            to: '/r/$resourceKey/$recordId',
            params: { resourceKey, recordId: String(newId) },
            replace: id === null
          })
        }
        onClose={backToList}
        renderFrame={({ title, badge, actions, body }) => (
          <Page
            parent={{ label: resource.label, onClick: backToList }}
            title={title}
            badge={badge}
            actions={actions}
          >
            {body}
          </Page>
        )}
      />
      <ConfirmDialog
        opened={blocker.status === 'blocked'}
        title={t('discardTitle')}
        confirmLabel={t('discard')}
        danger
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      >
        {t('discardBody')}
      </ConfirmDialog>
    </>
  )
}
