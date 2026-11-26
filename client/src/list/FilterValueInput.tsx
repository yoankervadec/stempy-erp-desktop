import { MultiSelect, Select, TagsInput, TextInput } from '@mantine/core'
import { useState } from 'react'
import type { MetaField } from '../api/types'
import { ReferencePicker } from '../fields/ReferencePicker'
import { formatValue } from '../platform/format'
import { useLanguage } from '../platform/meta'
import { useText } from '../platform/useText'
import { parseScalar, type FilterChoice } from './filters'

/** A filter's value as the server reads it, and as the filter pill shows it. */
export interface FilterValue {
  value: unknown
  display: string
}

interface Props {
  field: MetaField
  choice: FilterChoice
  /** null: nothing valid entered yet. */
  onChange: (value: FilterValue | null) => void
}

/** The value editor for one field and operator. Remount it (key) when either changes. */
export function FilterValueInput({ field, choice, onChange }: Props): React.JSX.Element | null {
  const t = useText()
  const language = useLanguage()
  const [raw, setRaw] = useState('')
  const [invalid, setInvalid] = useState(false)
  const label = t('value')
  const show = (value: unknown): string => formatValue(field, value, undefined, language)

  if (choice === 'isEmpty' || choice === 'isNotEmpty') return null

  if (choice === 'in') {
    if (field.type === 'enum') {
      return (
        <MultiSelect
          label={label}
          data={(field.values ?? []).map((v) => ({ value: v.value, label: v.label }))}
          onChange={(values) =>
            onChange(values.length ? { value: values, display: values.map(show).join(', ') } : null)
          }
          comboboxProps={{ withinPortal: false }}
        />
      )
    }
    return (
      <TagsInput
        label={label}
        description={t('valuesHint')}
        maxTags={100}
        error={invalid ? t('invalidValue') : undefined}
        onChange={(tags) => {
          const values = tags.map((tag) => parseScalar(field, tag))
          const bad = values.some((v) => v === undefined)
          setInvalid(bad)
          onChange(
            !bad && values.length ? { value: values, display: values.map(show).join(', ') } : null
          )
        }}
      />
    )
  }

  switch (field.type) {
    case 'enum':
      return (
        <Select
          label={label}
          data={(field.values ?? []).map((v) => ({ value: v.value, label: v.label }))}
          onChange={(v) => onChange(v == null ? null : { value: v, display: show(v) })}
          comboboxProps={{ withinPortal: false }}
        />
      )
    case 'boolean':
      return (
        <Select
          label={label}
          data={[
            { value: 'true', label: t('yes') },
            { value: 'false', label: t('no') }
          ]}
          onChange={(v) =>
            onChange(v == null ? null : { value: v === 'true', display: show(v === 'true') })
          }
          comboboxProps={{ withinPortal: false }}
        />
      )
    case 'reference':
      return (
        <ReferencePicker
          label={label}
          resource={field.ref!}
          value={raw === '' ? null : Number(raw)}
          onChange={(id, ref) => {
            setRaw(id == null ? '' : String(id))
            onChange(id == null ? null : { value: id, display: ref?.title ?? String(id) })
          }}
          comboboxProps={{ withinPortal: false }}
        />
      )
    default: {
      const type =
        field.type === 'date' ? 'date' : field.type === 'timestamp' ? 'datetime-local' : 'text'
      return (
        <TextInput
          label={label}
          type={type}
          inputMode={
            field.type === 'integer' ? 'numeric' : field.type === 'decimal' ? 'decimal' : undefined
          }
          maxLength={field.maxLength}
          value={raw}
          error={invalid ? t('invalidValue') : undefined}
          onChange={(e) => {
            const next = e.currentTarget.value
            setRaw(next)
            const value = parseScalar(field, next)
            setInvalid(next.trim() !== '' && value === undefined)
            onChange(value === undefined ? null : { value, display: show(value) })
          }}
        />
      )
    }
  }
}
