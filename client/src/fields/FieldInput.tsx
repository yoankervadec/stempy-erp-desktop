import {
  Checkbox,
  PasswordInput,
  Select,
  Textarea,
  TextInput,
  type MantineSize
} from '@mantine/core'
import type { MetaField, MetaParam, Row } from '../api/types'
import { formatValue } from '../platform/format'
import { useLanguage } from '../platform/meta'
import { useText } from '../platform/useText'
import { toWire } from '../record/values'
import { ReferencePicker } from './ReferencePicker'

export interface FieldInputProps {
  field: MetaField | MetaParam
  /** The form value (see record/values.ts). */
  value: unknown
  onChange: (value: unknown) => void
  onBlur?: () => void
  readOnly?: boolean
  /** A message under the input, or true for a red edge only (grid cells). */
  error?: string | boolean
  /** The row the value belongs to: its _refs name references and currencies. */
  row?: Row
  /** In a grid cell: no label, smaller. */
  compact?: boolean
  size?: MantineSize
}

/**
 * The editor of one value, chosen by its type. Read-only values are shown
 * formatted, as in lists. Required marks and limits come from /meta; the
 * server checks them again on save.
 */
export function FieldInput({
  field,
  value,
  onChange,
  onBlur,
  readOnly,
  error,
  row,
  compact,
  size
}: FieldInputProps): React.JSX.Element {
  const t = useText()
  const language = useLanguage()
  const label = compact ? undefined : field.label
  const common = {
    label,
    'aria-label': field.label,
    error,
    size: size ?? 'xs',
    required: !readOnly && field.required,
    onBlur
  }
  const format = 'format' in field ? field.format : undefined
  // An action param to mask and never keep (a password).
  const secret = 'secret' in field && field.secret === true

  if (readOnly) {
    if (field.type === 'boolean' && compact) {
      return <Checkbox aria-label={field.label} checked={!!value} readOnly size="xs" />
    }
    const shown = formatValue(field, toWire(field, value), row, language)
    if (format === 'multiline' && !compact) {
      return <Textarea {...common} value={shown} readOnly variant="filled" autosize maxRows={8} />
    }
    return (
      <TextInput
        {...common}
        value={shown}
        readOnly
        variant="filled"
        styles={{
          input: {
            textAlign: field.type === 'decimal' || field.type === 'integer' ? 'right' : undefined
          }
        }}
      />
    )
  }

  switch (field.type) {
    case 'boolean':
      return (
        <Checkbox
          label={label}
          aria-label={field.label}
          checked={!!value}
          onChange={(e) => onChange(e.currentTarget.checked)}
          onBlur={onBlur}
          error={error}
          size="xs"
          mt={compact ? 0 : 'lg'}
        />
      )
    case 'enum':
      return (
        <Select
          {...common}
          data={(field.values ?? []).map((v) => ({ value: v.value, label: v.label }))}
          value={(value as string | null) ?? null}
          onChange={(v) => onChange(v)}
          clearable={!field.required}
        />
      )
    case 'reference':
      return (
        <ReferencePicker
          {...common}
          resource={field.ref!}
          value={(value as number | null) ?? null}
          selected={row?._refs?.[field.name] ?? null}
          onChange={(id) => onChange(id)}
        />
      )
    case 'string':
      if (secret) {
        return (
          <PasswordInput
            {...common}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.currentTarget.value)}
            maxLength={field.maxLength}
            autoComplete="new-password"
          />
        )
      }
      if (format === 'multiline' && !compact) {
        return (
          <Textarea
            {...common}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.currentTarget.value)}
            maxLength={field.maxLength}
            autosize
            minRows={2}
            maxRows={8}
          />
        )
      }
      return (
        <TextInput
          {...common}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.currentTarget.value)}
          maxLength={field.maxLength}
        />
      )
    case 'integer':
    case 'decimal':
      return (
        <TextInput
          {...common}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.currentTarget.value)}
          inputMode={field.type === 'integer' ? 'numeric' : 'decimal'}
          rightSection={format === 'percent' ? '%' : undefined}
          styles={{ input: { textAlign: 'right' } }}
        />
      )
    case 'date':
      return (
        <TextInput
          {...common}
          type="date"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.currentTarget.value)}
        />
      )
    case 'timestamp':
      return (
        <TextInput
          {...common}
          type="datetime-local"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.currentTarget.value)}
        />
      )
    default:
      return (
        <TextInput
          {...common}
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.currentTarget.value)}
          placeholder={t('value')}
        />
      )
  }
}
