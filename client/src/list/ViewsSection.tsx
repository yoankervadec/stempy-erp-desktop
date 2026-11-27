import { Button, Group, Text, TextInput, UnstyledButton } from '@mantine/core'
import { useState } from 'react'
import { useText } from '../platform/useText'
import { ConfirmDialog } from '../shell/ConfirmDialog'
import classes from './FilterPane.module.css'
import { MAX_VIEW_NAME, MAX_VIEWS, type ListView } from './views'

export interface ViewsControl {
  views: ListView[]
  /** The view the list is on; null: all records. */
  activeId: string | null
  /** The list no longer shows exactly what the active view says (or, on "All", is narrowed). */
  modified: boolean
  select: (id: string | null) => void
  saveAs: (name: string) => void
  save: () => void
  rename: (name: string) => void
  remove: () => void
}

/** A view's name, typed inline: Enter keeps it, Esc gives up. */
function NameForm({
  initial,
  onDone,
  onCancel
}: {
  initial: string
  onDone: (name: string) => void
  onCancel: () => void
}): React.JSX.Element {
  const t = useText()
  const [name, setName] = useState(initial)
  const ok = name.trim().length > 0
  return (
    <form
      className={classes.form}
      onSubmit={(e) => {
        e.preventDefault()
        if (ok) onDone(name.trim())
      }}
    >
      <TextInput
        label={t('viewName')}
        autoFocus
        maxLength={MAX_VIEW_NAME}
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            onCancel()
          }
        }}
      />
      <Group gap="xs" justify="flex-end" mt={6}>
        <Button variant="default" onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={!ok}>
          {t('ok')}
        </Button>
      </Group>
    </form>
  )
}

/** The top of the filter pane: "All", then the saved views; what to do with the active one. */
export function ViewsSection({ control }: { control: ViewsControl }): React.JSX.Element {
  const t = useText()
  const { views, activeId, modified } = control
  const active = views.find((v) => v.id === activeId)
  const [naming, setNaming] = useState<'new' | 'rename' | null>(null)
  const [deleting, setDeleting] = useState(false)
  const full = views.length >= MAX_VIEWS

  const row = (id: string | null, name: string): React.JSX.Element => {
    const current = id === activeId
    return (
      <UnstyledButton
        key={id ?? ''}
        className={classes.view}
        data-active={current || undefined}
        aria-current={current || undefined}
        onClick={() => control.select(id)}
      >
        <Text size="sm" truncate fw={current ? 600 : undefined}>
          {name}
        </Text>
        {current && modified && (
          <Text size="xs" c="dimmed" fs="italic" style={{ flex: 'none' }}>
            {t('viewModified')}
          </Text>
        )}
      </UnstyledButton>
    )
  }

  return (
    <div className={classes.views}>
      <Text className={classes.sectionTitle}>{t('views')}</Text>
      {row(null, t('allRecords'))}
      {views.map((v) => row(v.id, v.name))}

      {naming ? (
        <NameForm
          initial={naming === 'rename' ? (active?.name ?? '') : ''}
          onCancel={() => setNaming(null)}
          onDone={(name) => {
            if (naming === 'rename') control.rename(name)
            else control.saveAs(name)
            setNaming(null)
          }}
        />
      ) : (
        <Group gap={0} px={4} py={4}>
          {active && modified && (
            <UnstyledButton className={classes.link} onClick={control.save}>
              {t('saveView')}
            </UnstyledButton>
          )}
          <UnstyledButton
            className={classes.link}
            disabled={full}
            title={full ? t('tooManyViews', { max: MAX_VIEWS }) : undefined}
            onClick={() => setNaming('new')}
          >
            {t('saveViewAs')}
          </UnstyledButton>
          {active && (
            <>
              <UnstyledButton className={classes.link} onClick={() => setNaming('rename')}>
                {t('renameView')}
              </UnstyledButton>
              <UnstyledButton className={classes.link} onClick={() => setDeleting(true)}>
                {t('deleteView')}
              </UnstyledButton>
            </>
          )}
        </Group>
      )}

      <ConfirmDialog
        opened={deleting}
        title={t('deleteViewTitle')}
        confirmLabel={t('deleteView')}
        danger
        onConfirm={() => {
          setDeleting(false)
          control.remove()
        }}
        onCancel={() => setDeleting(false)}
      >
        {t('deleteViewBody', { name: active?.name ?? '' })}
      </ConfirmDialog>
    </div>
  )
}
