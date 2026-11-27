import { Button, Group, Pill, Popover, Select, Stack, Text } from '@mantine/core'
import { useState } from 'react'
import type { MetaField, MetaResource } from '../api/types'
import { useText } from '../platform/useText'
import {
  choiceLabelKey,
  defaultChoice,
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
  onAdd
}: {
  fields: MetaField[]
  onAdd: (filter: AppliedFilter) => void
}): React.JSX.Element {
  const t = useText()
  const [fieldName, setFieldName] = useState<string | null>(null)
  const [choice, setChoice] = useState<FilterChoice | null>(null)
  const [value, setValue] = useState<FilterValue | null>(null)
  const field = fields.find((f) => f.name === fieldName)
  const choices = field ? filterChoices(field) : []
  const ready = !!field && !!choice && (!needsValue(choice) || value !== null)

  return (
    <Stack gap="sm" w={300}>
      <Select
        label={t('field')}
        searchable
        data={fields.map((f) => ({ value: f.name, label: f.label }))}
        value={fieldName}
        onChange={(name) => {
          const f = fields.find((x) => x.name === name)
          setFieldName(name)
          setChoice(f ? defaultChoice(f) : null)
          setValue(null)
        }}
        comboboxProps={{ withinPortal: false }}
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
          comboboxProps={{ withinPortal: false }}
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
    </Stack>
  )
}

/** The applied filters as removable pills, and the button that adds one. */
export function FilterBar({
  resource,
  filters,
  onChange
}: {
  resource: MetaResource
  filters: AppliedFilter[]
  onChange: (filters: AppliedFilter[]) => void
}): React.JSX.Element | null {
  const t = useText()
  const [open, setOpen] = useState(false)
  const filterable = resource.fields.filter((f) => f.filterable && filterChoices(f).length > 0)
  if (filterable.length === 0) return null
  const full = filters.length >= MAX_FILTERS

  return (
    <Group gap="xs">
      <Popover opened={open} onChange={setOpen} position="bottom-start" shadow="md" trapFocus>
        <Popover.Target>
          <Button
            variant="default"
            size="xs"
            disabled={full}
            title={full ? t('tooManyFilters', { max: MAX_FILTERS }) : undefined}
            onClick={() => setOpen((o) => !o)}
          >
            {t('addFilter')}
          </Button>
        </Popover.Target>
        <Popover.Dropdown>
          {open && (
            <AddFilterForm
              fields={filterable}
              onAdd={(f) => {
                onChange([...filters, f])
                setOpen(false)
              }}
            />
          )}
        </Popover.Dropdown>
      </Popover>
      {filters.map((f) => {
        const field = resource.fields.find((x) => x.name === f.field)
        const label = field ? t(choiceLabelKey(field, f.choice)) : f.choice
        return (
          <Pill
            key={f.id}
            size="md"
            withRemoveButton
            onRemove={() => onChange(filters.filter((x) => x.id !== f.id))}
          >
            <Text span size="sm" fw={600}>
              {field?.label ?? f.field}
            </Text>{' '}
            {label}
            {f.display && ` ${f.display}`}
          </Pill>
        )
      })}
      {filters.length > 1 && (
        <Button variant="subtle" size="xs" onClick={() => onChange([])}>
          {t('clearFilters')}
        </Button>
      )}
    </Group>
  )
}
