import { Select, type SelectProps } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { queryList } from '../api/query'
import type { RefTitle, ResourceKey, Row } from '../api/types'
import { useResource } from '../platform/meta'

const PAGE = 20

/** A row's name by the target resource's hints (title, subtitle). */
function refOf(row: Row, title: string, subtitle: string | null, idField: string): RefTitle {
  const id = row[idField] as number
  const t = row[title]
  const s = subtitle ? row[subtitle] : null
  return {
    id,
    title: t === null || t === undefined ? String(id) : String(t),
    subtitle: s === null || s === undefined ? null : String(s)
  }
}

function optionLabel(ref: RefTitle): string {
  return ref.subtitle ? `${ref.title} - ${ref.subtitle}` : ref.title
}

export interface ReferencePickerProps extends Omit<
  SelectProps,
  'data' | 'value' | 'onChange' | 'searchable' | 'filter'
> {
  /** The target resource's key (a field's `ref`). */
  resource: ResourceKey
  value: number | null
  /** The selected row's name, so the input shows it before any search ran (from `_refs`). */
  selected?: RefTitle | null
  onChange: (id: number | null, ref: RefTitle | null) => void
}

/**
 * Picks one record of another resource, searched on the server (QUERY with
 * "search"), named by its title and subtitle. A target that isn't searchable
 * lists its first rows in its own order.
 */
export function ReferencePicker({
  resource: key,
  value,
  selected,
  onChange,
  ...props
}: ReferencePickerProps): React.JSX.Element {
  const target = useResource(key)
  const [search, setSearch] = useState('')
  const [debounced] = useDebouncedValue(search, 250)
  const [picked, setPicked] = useState<RefTitle | null>(selected ?? null)
  // While the input shows the picked option's label, it is not a search.
  const term = picked && debounced === optionLabel(picked) ? '' : debounced.trim()

  const rows = useQuery({
    queryKey: ['ref-options', key, target?.searchable ? term : ''],
    queryFn: () =>
      queryList(target!, {
        sort: target!.defaultSort,
        page: { limit: PAGE },
        ...(target!.searchable && term ? { search: term.slice(0, 100) } : {})
      }),
    enabled: !!target,
    placeholderData: keepPreviousData,
    staleTime: 30_000
  })

  const refs = (rows.data?.data ?? []).map((row) =>
    refOf(row, target!.title, target!.subtitle, target!.idField)
  )
  const current = value == null ? null : (refs.find((r) => r.id === value) ?? picked)
  if (current && !refs.some((r) => r.id === current.id)) refs.unshift(current)

  return (
    <Select
      {...props}
      searchable
      clearable={props.clearable ?? !props.required}
      data={refs.map((r) => ({ value: String(r.id), label: optionLabel(r) }))}
      // The server filters when it can; otherwise Mantine filters the rows loaded.
      {...(target?.searchable ? { filter: ({ options }) => options } : {})}
      value={value == null ? null : String(value)}
      searchValue={search}
      onSearchChange={setSearch}
      onChange={(v) => {
        const ref = v == null ? null : (refs.find((r) => String(r.id) === v) ?? null)
        setPicked(ref)
        onChange(ref?.id ?? null, ref)
      }}
    />
  )
}
