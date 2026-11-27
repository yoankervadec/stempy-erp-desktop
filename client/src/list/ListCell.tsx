import { Text } from '@mantine/core'
import type { MetaField, Row } from '../api/types'
import { FieldInput } from '../fields/FieldInput'
import { formatValue } from '../platform/format'
import { useLanguage } from '../platform/meta'
import { canEditInList, useListEditorContext } from './useListEditor'

/**
 * One cell of a list: the formatted value, or its input while the list is in
 * edit mode. A component of its own, so the columns stay fixed and an input
 * keeps its focus while the user types.
 */
export function ListCell({ field, row }: { field: MetaField; row: Row }): React.JSX.Element {
  const language = useLanguage()
  const editor = useListEditorContext()

  if (editor?.editing && canEditInList(field)) {
    const message = editor.problem(row)?.fields[field.name]
    return (
      <div title={message}>
        <FieldInput
          field={field}
          compact
          value={editor.value(row, field)}
          onChange={(v) => editor.setValue(row, field, v)}
          error={message ? true : undefined}
          row={row}
        />
      </div>
    )
  }

  const text = formatValue(field, row[field.name], row, language)
  const deleted = field.type === 'reference' && row._refs?.[field.name]?.deleted
  return deleted ? (
    <Text span size="sm" td="line-through" c="dimmed">
      {text}
    </Text>
  ) : (
    <>{text}</>
  )
}
