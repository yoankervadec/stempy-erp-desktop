import type { FilterNode, MetaField, OperatorName } from '../api/types'
import type { TextKey } from '../platform/i18n'

/** The server's limit on conditions in one QUERY (API_GUIDE section 6). */
export const MAX_FILTERS = 20

/**
 * The operator as the user picks it. isNull is split in two, since its value
 * (true / false) is the whole meaning: "is empty", "is not empty".
 */
export type FilterChoice = Exclude<OperatorName, 'isNull'> | 'isEmpty' | 'isNotEmpty'

/** One applied condition, with the text to show for its value. */
export interface AppliedFilter {
  id: string
  field: string
  choice: FilterChoice
  value: unknown
  display: string
}

/** What the user may pick for a field: the server's operators, minus what has no editor yet. */
export function filterChoices(field: MetaField): FilterChoice[] {
  const ops = field.operators ?? []
  const out: FilterChoice[] = []
  for (const op of ops) {
    if (op === 'isNull') continue
    // A reference's "in" needs a multi-record picker; not built yet.
    if (op === 'in' && field.type === 'reference') continue
    out.push(op)
  }
  if (ops.includes('isNull')) out.push('isEmpty', 'isNotEmpty')
  return out
}

const CHOICE_LABELS: Record<FilterChoice, TextKey> = {
  equals: 'op.equals',
  notEquals: 'op.notEquals',
  greaterThan: 'op.greaterThan',
  greaterThanOrEquals: 'op.greaterThanOrEquals',
  lessThan: 'op.lessThan',
  lessThanOrEquals: 'op.lessThanOrEquals',
  in: 'op.in',
  contains: 'op.contains',
  startsWith: 'op.startsWith',
  isEmpty: 'op.isEmpty',
  isNotEmpty: 'op.isNotEmpty'
}

/** Dates and times read better as before / after. */
const TEMPORAL_LABELS: Partial<Record<FilterChoice, TextKey>> = {
  greaterThan: 'op.date.greaterThan',
  greaterThanOrEquals: 'op.date.greaterThanOrEquals',
  lessThan: 'op.date.lessThan',
  lessThanOrEquals: 'op.date.lessThanOrEquals'
}

export function choiceLabelKey(field: MetaField, choice: FilterChoice): TextKey {
  const temporal = field.type === 'date' || field.type === 'timestamp'
  return (temporal && TEMPORAL_LABELS[choice]) || CHOICE_LABELS[choice]
}

/** The operator a new filter starts with: "contains" for text when offered, else the first. */
export function defaultChoice(field: MetaField): FilterChoice | null {
  const choices = filterChoices(field)
  if (field.type === 'string' && choices.includes('contains')) return 'contains'
  return choices[0] ?? null
}

/** Whether the choice needs a value from the user. */
export function needsValue(choice: FilterChoice): boolean {
  return choice !== 'isEmpty' && choice !== 'isNotEmpty'
}

function toCondition(f: AppliedFilter): FilterNode {
  if (f.choice === 'isEmpty') return { field: f.field, op: 'isNull', value: true }
  if (f.choice === 'isNotEmpty') return { field: f.field, op: 'isNull', value: false }
  return { field: f.field, op: f.choice, value: f.value }
}

/** The QUERY "where": every condition must hold. */
export function toWhere(filters: AppliedFilter[]): FilterNode | undefined {
  if (filters.length === 0) return undefined
  if (filters.length === 1) return toCondition(filters[0])
  return { and: filters.map(toCondition) }
}

/**
 * A typed value from what the user typed, as the server reads it:
 * integers as numbers, decimals as strings, dates as YYYY-MM-DD, instants in
 * UTC with whole seconds. undefined: not a valid value (yet).
 */
export function parseScalar(field: MetaField, raw: string): unknown {
  const s = raw.trim()
  if (s === '') return undefined
  switch (field.type) {
    case 'integer':
    case 'reference': {
      if (!/^-?\d+$/.test(s)) return undefined
      const n = Number(s)
      return Number.isSafeInteger(n) ? n : undefined
    }
    case 'decimal': {
      const d = s.replace(',', '.')
      return /^-?\d+(\.\d+)?$/.test(d) ? d : undefined
    }
    case 'date':
      return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined
    case 'timestamp': {
      // From <input type="datetime-local">: local wall time, sent as a UTC instant.
      const d = new Date(s)
      return Number.isNaN(d.getTime()) ? undefined : d.toISOString().replace(/\.\d{3}Z$/, 'Z')
    }
    default:
      return s
  }
}
