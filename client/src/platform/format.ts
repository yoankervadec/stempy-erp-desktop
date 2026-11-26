import type { EnumValue, FieldFormat, FieldTypeName, Language, Row } from '../api/types'
import { locale, text } from './i18n'

/** What formatting needs to know about a value: a field, a column, a report column. */
export interface Formattable {
  name?: string
  type: FieldTypeName
  values?: EnumValue[]
  scale?: number
  format?: FieldFormat
  currencyField?: string
}

const CURRENCY_CODE = /^[A-Z]{3}$/

/**
 * A money value's currency code, when the row names it: the currency field's
 * reference title ("CAD"). Otherwise the amount is shown as a plain number.
 */
function currencyOf(f: Formattable, row: Row | undefined): string | undefined {
  if (!f.currencyField || !row) return undefined
  const title = row._refs?.[f.currencyField]?.title
  return title && CURRENCY_CODE.test(title) ? title : undefined
}

/**
 * Decimals stay strings: Intl formats a numeric string exactly (no float
 * rounding), so the value is never turned into a JS number.
 */
function formatDecimal(
  value: unknown,
  f: Formattable,
  row: Row | undefined,
  language: Language
): string {
  const digits = f.scale ?? 2
  const s = String(value)
  const fractions = { minimumFractionDigits: digits, maximumFractionDigits: digits }
  if (f.format === 'percent') {
    // 5.25 means 5.25 %.
    return new Intl.NumberFormat(locale(language), {
      ...fractions,
      style: 'unit',
      unit: 'percent'
    }).format(s as Intl.StringNumericLiteral)
  }
  const currency = f.format === 'money' ? currencyOf(f, row) : undefined
  return new Intl.NumberFormat(locale(language), {
    ...fractions,
    ...(currency ? { style: 'currency', currency } : {})
  }).format(s as Intl.StringNumericLiteral)
}

/** "2027-04-01" as a calendar date: read and written in UTC, so no time zone shifts it. */
export function formatDate(value: string, language: Language): string {
  const d = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat(locale(language), { dateStyle: 'medium', timeZone: 'UTC' }).format(
    d
  )
}

/** An instant, in the user's time zone. */
export function formatInstant(value: string, language: Language): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat(locale(language), {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(d)
}

/** One value as text, for a cell or a label. `row` supplies `_refs` (references, currencies). */
export function formatValue(
  f: Formattable,
  value: unknown,
  row: Row | undefined,
  language: Language
): string {
  if (value === null || value === undefined || value === '') return ''
  switch (f.type) {
    case 'decimal':
      return formatDecimal(value, f, row, language)
    case 'integer':
      return typeof value === 'number'
        ? new Intl.NumberFormat(locale(language)).format(value)
        : String(value)
    case 'boolean':
      return text(language, value ? 'yes' : 'no')
    case 'date':
      return formatDate(String(value), language)
    case 'timestamp':
      return formatInstant(String(value), language)
    case 'enum':
      return f.values?.find((v) => v.value === value)?.label ?? String(value)
    case 'reference': {
      const ref = f.name ? row?._refs?.[f.name] : undefined
      return ref?.title ?? String(value)
    }
    default:
      return String(value)
  }
}

/** Numbers line up on the right. */
export function alignOf(type: FieldTypeName): 'left' | 'right' {
  return type === 'integer' || type === 'decimal' ? 'right' : 'left'
}
