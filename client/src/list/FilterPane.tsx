import { Button, CloseButton, Group, Select, Stack, Text, UnstyledButton } from '@mantine/core'
import { useState } from 'react'
import type { MetaField, MetaResource } from '../api/types'
import { useText } from '../platform/useText'
import classes from './FilterPane.module.css'
import {
  choiceLabelKey,
  defaultChoice,
  filterableFields,
  filterChoices,
  MAX_FILTERS,
  needsValue,
  type AppliedFilter,
  type FilterChoice
} from './filters'
import { FilterValueInput, type FilterValue } from './FilterValueInput'

let nextId = 0

/** The "add filter" form: field, then operator, then a value typed for both. */
function AddFilterForm({
  fields,
  onAdd,
  onCancel
}: {
  fields: MetaField[]
  onAdd: (filter: AppliedFilter) => void
  onCancel: () => void
}): React.JSX.Element {
  const t = useText()
  const [fieldName, setFieldName] = useState<string | null>(null)
  const [choice, setChoice] = useState<FilterChoice | null>(null)
  const [value, setValue] = useState<FilterValue | null>(null)
  const field = fields.find((f) => f.name === fieldName)
  const choices = field ? filterChoices(field) : []
  const ready = !!field && !!choice && (!needsValue(choice) || value !== null)

  return (
    <Stack gap={6} className={classes.form}>
      <Select
        label={t('field')}
        searchable
        autoFocus
        data={fields.map((f) => ({ value: f.name, label: f.label }))}
        value={fieldName}
        onChange={(name) => {
          const f = fields.find((x) => x.name === name)
          setFieldName(name)
          setChoice(f ? defaultChoice(f) : null)
          setValue(null)
        }}
      />
      {field && (
        <Select
          label={t('operator')}
          allowDeselect={false}
          data={choices.map((c) => ({ value: c, label: t(choiceLabelKey(field, c)) }))}
          value={choice}
          onChange={(c) => {
            setChoice(c as FilterChoice)
            setValue(null)
          }}
        />
      )}
      {field && choice && (
        <FilterValueInput
          key={`${field.name}:${choice}`}
          field={field}
          choice={choice}
          onChange={setValue}
        />
      )}
      <Group gap="xs" justify="flex-end">
        <Button variant="default" onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button
          disabled={!ready}
          onClick={() => {
            if (!field || !choice) return
            onAdd({
              id: `f${++nextId}`,
              field: field.name,
              choice,
              value: value?.value,
              display: value?.display ?? ''
            })
          }}
        >
          {t('apply')}
        </Button>
      </Group>
    </Stack>
  )
}

/**
 * The filter pane on the left of a list, as in Business Central: the applied
 * conditions one per row, and a form to add one. Every condition must hold.
 */
export function FilterPane({
  resource,
  filters,
  onChange,
  onClose
}: {
  resource: MetaResource
  filters: AppliedFilter[]
  onChange: (filters: AppliedFilter[]) => void
  onClose: () => void
}): React.JSX.Element {
  const t = useText()
  const [adding, setAdding] = useState(false)
  const filterable = filterableFields(resource)
  const full = filters.length >= MAX_FILTERS

  return (
    <aside className={classes.pane} aria-label={t('filters')}>
      <Group justify="space-between" wrap="nowrap" className={classes.paneHeader}>
        <Text fw={600} size="sm">
          {t('filters')}
          {filters.length > 0 && ` (${filters.length})`}
        </Text>
        <CloseButton size="sm" aria-label={t('close')} title={t('close')} onClick={onClose} />
      </Group>

      {filters.length === 0 && !adding && (
        <Text size="sm" c="dimmed" px={8} py={6}>
          {t('noFilters')}
        </Text>
      )}

      {filters.map((f) => {
        const field = resource.fields.find((x) => x.name === f.field)
        const label = field ? t(choiceLabelKey(field, f.choice)) : f.choice
        return (
          <div key={f.id} className={classes.filter}>
            <div className={classes.filterText}>
              <Text size="sm" fw={600} truncate>
                {field?.label ?? f.field}
              </Text>
              <Text size="sm" truncate title={`${label} ${f.display}`}>
                {label}
                {f.display && ` ${f.display}`}
              </Text>
            </div>
            <CloseButton
              size="sm"
              aria-label={t('removeFilter')}
              title={t('removeFilter')}
              onClick={() => onChange(filters.filter((x) => x.id !== f.id))}
            />
          </div>
        )
      })}

      {adding ? (
        <AddFilterForm
          fields={filterable}
          onAdd={(f) => {
            onChange([...filters, f])
            setAdding(false)
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <Group gap={0} justify="space-between" px={4} py={4}>
          <UnstyledButton
            className={classes.link}
            disabled={full}
            title={full ? t('tooManyFilters', { max: MAX_FILTERS }) : undefined}
            onClick={() => setAdding(true)}
          >
            + {t('addFilter')}
          </UnstyledButton>
          {filters.length > 1 && (
            <UnstyledButton className={classes.link} onClick={() => onChange([])}>
              {t('clearFilters')}
            </UnstyledButton>
          )}
        </Group>
      )}
    </aside>
  )
}
