import { ActionIcon, Button, Group, Table, Text, Title } from '@mantine/core'
import { Controller, useFieldArray, useWatch, type Control } from 'react-hook-form'
import type { LayoutCollection, Row } from '../api/types'
import { FieldInput } from '../fields/FieldInput'
import { alignOf, formatValue } from '../platform/format'
import { useLanguage } from '../platform/meta'
import { useText } from '../platform/useText'
import {
  canEditCollection,
  canEditColumn,
  newLineKey,
  toInput,
  toWire,
  sumDecimals,
  type FormLine
} from './values'

type LinesForm = Record<string, FormLine[]>

/** A small cross: remove a line. */
export function RemoveIcon(): React.JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

/**
 * A document's lines (a collection whose rows come inside the record), edited
 * in place. Columns the server computes are read-only and show the last
 * /calculate answer when there is one. Footer sums add the shown values exactly.
 */
export function CollectionGrid({
  collection: c,
  control,
  row,
  calculated,
  errorAt
}: {
  collection: LayoutCollection
  control: Control<Record<string, unknown>>
  /** The record as last read (or from /new). */
  row: Row
  /** The lines of the last /calculate answer, by position. */
  calculated?: Row[]
  errorAt: (path: string) => string | undefined
}): React.JSX.Element {
  const t = useText()
  const language = useLanguage()
  const linesControl = control as unknown as Control<LinesForm>
  const { fields, append, remove } = useFieldArray({
    control: linesControl,
    name: c.name,
    // Our lines have their own "id" (the stored line's); keep RHF's key apart.
    keyName: '_rhfKey'
  })
  const lines = (useWatch({ control: linesControl, name: c.name }) ?? []) as FormLine[]
  const editable = canEditCollection(row, c)
  const stored = (row[c.name] as Row[] | undefined) ?? []
  const canAddRemove = editable && !c.fixedRows

  /** The row a line's references and currencies are named from. */
  const lineRow = (index: number): Row | undefined => {
    const id = lines[index]?.id
    return calculated?.[index] ?? (id == null ? undefined : stored.find((s) => s.id === id))
  }
  /** What a cell shows: the form's value, or the server's computed one. */
  const cellInput = (index: number, name: string, editableCell: boolean): unknown => {
    if (!editableCell && calculated?.[index]) {
      const col = c.columns.find((x) => x.name === name)!
      return toInput(col, calculated[index][name])
    }
    return lines[index]?.[name]
  }

  return (
    <div>
      <Group justify="space-between" mb={4}>
        <Title order={5}>{c.label}</Title>
        {canAddRemove && (
          <Button
            size="xs"
            variant="light"
            onClick={() => {
              const line: FormLine = { _key: newLineKey() }
              for (const col of c.columns) line[col.name] = toInput(col, null)
              append(line)
            }}
          >
            {t('addLine')}
          </Button>
        )}
      </Group>
      <Table.ScrollContainer minWidth={c.columns.length * 140}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              {c.columns.map((col) => (
                <Table.Th
                  key={col.name}
                  style={{ textAlign: alignOf(col.type), whiteSpace: 'nowrap' }}
                >
                  {col.label}
                </Table.Th>
              ))}
              {canAddRemove && <Table.Th w={40} />}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {fields.map((item, index) => (
              <Table.Tr key={item._rhfKey}>
                {c.columns.map((col) => {
                  const editableCell =
                    canEditColumn(row, c, col) && (lines[index]?.id != null || col.writable.create)
                  const path = `${c.name}.${index}.${col.name}`
                  return (
                    <Table.Td key={col.name}>
                      {editableCell ? (
                        <Controller
                          control={control}
                          name={path}
                          render={({ field }) => (
                            <FieldInput
                              compact
                              field={col}
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              row={lineRow(index)}
                              error={errorAt(path)}
                            />
                          )}
                        />
                      ) : (
                        <FieldInput
                          compact
                          readOnly
                          field={col}
                          value={cellInput(index, col.name, false)}
                          onChange={() => {}}
                          row={lineRow(index)}
                          error={errorAt(path)}
                        />
                      )}
                    </Table.Td>
                  )
                })}
                {canAddRemove && (
                  <Table.Td>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label={t('removeLine')}
                      title={t('removeLine')}
                      onClick={() => remove(index)}
                    >
                      <RemoveIcon />
                    </ActionIcon>
                  </Table.Td>
                )}
              </Table.Tr>
            ))}
          </Table.Tbody>
          {c.footerSums.length > 0 && fields.length > 0 && (
            <Table.Tfoot>
              <Table.Tr>
                {c.columns.map((col) => {
                  if (!c.footerSums.includes(col.name)) return <Table.Td key={col.name} />
                  const editableCol = canEditColumn(row, c, col)
                  const sum = sumDecimals(
                    fields.map((_, i) => toWire(col, cellInput(i, col.name, editableCol)))
                  )
                  return (
                    <Table.Td key={col.name} style={{ textAlign: 'right' }}>
                      <Text fw={700} size="sm">
                        {sum == null ? '' : formatValue(col, sum, lineRow(0), language)}
                      </Text>
                    </Table.Td>
                  )
                })}
                {canAddRemove && <Table.Td />}
              </Table.Tr>
            </Table.Tfoot>
          )}
        </Table>
      </Table.ScrollContainer>
    </div>
  )
}
