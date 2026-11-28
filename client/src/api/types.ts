/**
 * Wire types for the Stempy ERP server, API version 1.
 *
 * Source of truth, in ../stempy-erp-server:
 *   docs/API_GUIDE.md sections 2, 4, 5, 6, 10
 *   docs/ARCHITECTURE.md section 23
 *   platform/.../platform/web/MetaRoutes.java   (GET /meta)
 *   platform/.../platform/web/RecordMeta.java   (_meta)
 *   platform/.../platform/web/ApiError.java     (error body)
 *
 * Rules these types encode:
 * - Decimals are strings on the wire (Decimal). Never store them as numbers.
 * - Optional keys (`?`) are left out by the server when unset; keys typed
 *   `| null` are always present.
 * - The server adds keys without bumping apiVersion: never fail on unknown keys.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** The API version this client was written against (GET /meta apiVersion). */
export const SUPPORTED_API_VERSION = 1

/** A decimal as the server sends it: "0.2500". Plain notation, never exponent. */
export type Decimal = string
/** An ISO-8601 UTC instant, whole seconds: "2026-11-22T15:04:05Z". */
export type Instant = string
/** A calendar date: "2027-04-01". */
export type LocalDate = string
/** A server-assigned id. */
export type Id = number

export type Language = 'fr' | 'en'

/** A resource's stable name: "product", "glAccount". Never translated. */
export type ResourceKey = string
/** A module's name: "masterdata.items". */
export type ModuleName = string

// ---------------------------------------------------------------------------
// Errors (RFC 7807, Content-Type: application/problem+json)
// ---------------------------------------------------------------------------

export interface FieldError {
  /** Path of the problem: "name", "lines[2].quantity", "lines[0].id". */
  field: string
  /** Stable code: REQUIRED, TOO_LONG, LOCKED, READ_ONLY, UNKNOWN_LINE... */
  code: string
  /** Translated, for display only. */
  message: string
  /** Values the message names, as data ({ max: 50 }). Left out when empty. */
  params?: Record<string, unknown>
}

export interface Problem {
  /** "urn:stempy:problem:<code in lower case>" */
  type: string
  title: string
  status: number
  detail?: string
  instance?: string
  /** The stable thing to test against. */
  code: ErrorCode | (string & {})
  /** Show it in error dialogs: it finds the request in the server log. */
  requestId?: string
  /** Only on validation failures: every field problem, at most one per field. */
  errors?: FieldError[]
  /** On 409 VERSION_CONFLICT: the record (or whole document) as it is now. */
  current?: Row
}

/** The codes the generic screens react to. Modules add their own. */
export type ErrorCode =
  | 'BAD_REQUEST'
  | 'COMPANY_REQUIRED'
  | 'INVALID_COMPANY_ID'
  | 'INVALID_PARAMETER'
  | 'UNAUTHENTICATED'
  | 'SESSION_INVALID'
  | 'AUTH_HEADER_INVALID'
  | 'INVALID_CREDENTIALS'
  | 'PERMISSION_DENIED'
  | 'COMPANY_ACCESS_DENIED'
  | 'NOT_FOUND'
  | 'VERSION_CONFLICT'
  | 'RECORD_LOCKED'
  | 'DUPLICATE_VALUE'
  | 'VALIDATION_FAILED'
  | 'INVALID_REFERENCE'
  | 'NOT_SEARCHABLE'
  | 'LOGIN_RATE_LIMITED'
  | 'DATABASE_BUSY'

// ---------------------------------------------------------------------------
// Auth (API_GUIDE section 4)
// ---------------------------------------------------------------------------

export interface LoginRequest {
  userNo: string
  password: string
}

export interface CompanySummary {
  id: Id
  code: string
  description: string | null
}

export interface LoginResponse {
  /** Shown only here. Send as "Authorization: Bearer <token>". */
  token: string
  expiresAt: Instant
  idleTimeoutSeconds: number
  user: {
    id: Id
    userNo: string
    name: string
    /** The user's own choice; null means "each company's default". */
    language: Language | null
  }
  companies: CompanySummary[]
  /** Null when the user has several companies and no default: send X-Company-Id. */
  defaultCompanyId: Id | null
  /** The effective language for the default company. */
  language: Language
}

export interface MeResponse {
  user: { id: Id; userNo: string; name: string }
  company: CompanySummary
  permissions: string[]
  language: Language
}

/** PATCH /auth/me. null goes back to each company's default. */
export interface MePatch {
  language: Language | null
}

/** POST /auth/me/password: 204. This session stays open, the user's others end. */
export interface ChangePasswordRequest {
  currentPassword: string
  /** 8 to 256 characters. */
  newPassword: string
}

// ---------------------------------------------------------------------------
// Access administration (API_GUIDE section 12)
// ---------------------------------------------------------------------------

/** GET /access/permissions: { data: PermissionView[] }. */
export interface PermissionView {
  name: string
  /** As the code declares it (not translated). Null when not declared. */
  description: string | null
  /** False: still stored on a role, but the code no longer declares it (sending it back is UNKNOWN_PERMISSION). */
  declared: boolean
}

/** GET /access/roles/{id}/permissions. */
export interface RolePermissions {
  roleId: Id
  code: string
  /** The role's version: send it with PATCH /access/roles/{id}. */
  version: number
  allPermissions: boolean
  permissions: PermissionView[]
}

// ---------------------------------------------------------------------------
// GET /meta (API_GUIDE section 10, ARCHITECTURE 23.6)
// ---------------------------------------------------------------------------

export interface Meta {
  apiVersion: number
  language: Language
  menu: MenuGroup[]
  resources: MetaResource[]
  reports: MetaReport[]
}

export interface MenuGroup {
  module: ModuleName
  label: string
  /** Resource keys, in registration order. */
  resources: ResourceKey[]
  /** Report keys. */
  reports: string[]
}

export type FieldTypeName =
  | 'string'
  | 'integer'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'timestamp'
  | 'enum'
  /** A foreign key whose target the caller can read; see `ref`. */
  | 'reference'

export type FieldFormat = 'money' | 'percent' | 'multiline'

export type OperatorName =
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'greaterThanOrEquals'
  | 'lessThan'
  | 'lessThanOrEquals'
  | 'in'
  | 'contains'
  | 'startsWith'
  | 'isNull'

export interface EnumValue {
  value: string
  label: string
}

/** What fields, action params and report params share. */
interface TypedInput {
  name: string
  label: string
  type: FieldTypeName
  /** With type "reference": the target resource's key. */
  ref?: ResourceKey
  /** With type "enum". */
  values?: EnumValue[]
  required: boolean
  maxLength?: number
  /** Decimal as a string, also for integer fields. */
  min?: Decimal
  max?: Decimal
  /** Decimals only: digits to show and accept (2 when undeclared). */
  scale?: number
}

export interface MetaField extends TypedInput {
  unique: boolean
  format?: FieldFormat
  /** With format "money": the row's field holding the currency id. Else the company's currency. */
  currencyField?: string
  filterable: boolean
  sortable: boolean
  /** Only on filterable fields. */
  operators?: OperatorName[]
  /** Whether a form may send the field. The server checks again on every write. */
  writable: { create: boolean; update: boolean }
}

/** An action's or a report's parameter: the dialog's or the report form's input. */
export type MetaParam = TypedInput

export interface SortKey {
  field: string
  dir: 'asc' | 'desc'
}

export interface MetaResource {
  key: ResourceKey
  /** Plural. */
  label: string
  /** Singular. */
  labelOne: string
  module: ModuleName
  /** Base path of the routes: "/masterdata/products". */
  path: string
  /** Permissions only; a record's state is in its _meta. */
  can: { read: true; create: boolean; update: boolean; delete: boolean; history: boolean }
  idField: string
  versionField: string | null
  /** Field naming a row (pickers, modal titles). Falls back to the id field. */
  title: string
  subtitle: string | null
  listColumns: string[]
  /** Send it as the QUERY sort on first load. */
  defaultSort: SortKey[]
  presentation: 'modal' | 'page'
  /** QUERY "search" works. */
  searchable: boolean
  fields: MetaField[]
  layout: RecordLayout
  /** Only those the caller holds the permission for. */
  actions: MetaAction[]
}

export interface RecordLayout {
  /** True when the resource declares no layout and the server derived one. */
  derived: boolean
  sections: LayoutSection[]
  collections: LayoutCollection[]
  /** Read-only, server-computed header fields (totals). */
  summary: string[]
  tabs: LayoutTab[]
}

export interface LayoutSection {
  name: string
  label: string
  /** Grid columns. */
  columns: number
  /** Header field names, looked up in MetaResource.fields. */
  fields: string[]
}

export interface LayoutCollection {
  /** Key of the rows in the document body ("lines"). */
  name: string
  label: string
  /** The child entity's name. */
  entity: string
  /**
   * The child is a resource: QUERY {that resource's path} where `field`
   * equals the record's id. null: the rows come inside the record (documents).
   */
  source: { resource: ResourceKey; field: string } | null
  editable: boolean
  /** Rows can't be added or removed, only edited. */
  fixedRows: boolean
  columns: MetaField[]
  /** Column names whose sum goes in the footer. */
  footerSums: string[]
}

export interface LayoutTab {
  /** "history" today; later attachments, notes. */
  name: 'history' | (string & {})
  label: string
}

export interface MetaAction {
  name: string
  label: string
  /** record: on one record (check its _meta.actions); resource: on the list. */
  scope: 'record' | 'resource'
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Full path; "{id}" to fill in for record actions. */
  path: string
  /** Ask first. The worded question is in the record's _meta.actions[].confirm. */
  confirm: boolean
  /** The dialog's inputs, sent as a JSON body keyed by name. */
  params: MetaParam[]
}

export interface MetaReport {
  key: string
  label: string
  module: ModuleName
  method: 'GET'
  /** Run with GET {path}?param=value... */
  path: string
  params: MetaParam[]
  /** Values of the whole answer shown above the rows (opening, closing). */
  figures: ReportFigure[]
  /** Dotted path of the row array in the answer. */
  rows: string | null
  /** Row field giving its indentation (chart depth). */
  level: string | null
  /** Row field marking rows to show in bold (headings). */
  emphasis: string | null
  columns: ReportColumn[]
  /** Dotted path of the totals object in the answer. */
  totals: string | null
}

export interface ReportFigure {
  /** Dotted path into the answer. */
  path: string
  label: string
  type: Exclude<FieldTypeName, 'reference'>
  format?: FieldFormat
}

export interface ReportColumn {
  /** Dotted path into a row: "amounts.closing". */
  path: string
  label: string
  type: Exclude<FieldTypeName, 'reference'>
  scale?: number
  format?: FieldFormat
  values?: EnumValue[]
  /** Dotted path of this column's total inside `totals`, or null. */
  total: string | null
}

// ---------------------------------------------------------------------------
// Rows and records (API_GUIDE section 5, ARCHITECTURE 23.9, 23.10)
// ---------------------------------------------------------------------------

/** The name of a referenced record, so lists show names instead of ids. */
export interface RefTitle {
  id: Id
  title: string
  subtitle?: string | null
  /** The target was soft-deleted; it keeps its name. */
  deleted?: boolean
}

/** What one record allows now: permissions and its state combined. */
export interface RecordMeta {
  can: { update: boolean; delete: boolean }
  /** Fields its state freezes; "*" means all. */
  locked: string[]
  /** Record actions that apply now, with the confirmation already worded (null: none). */
  actions: { name: string; confirm: string | null }[]
}

/** _meta of GET {path}/new. */
export interface NewRecordMeta {
  new: true
}

/**
 * A row as the server sends it. Field values are typed by /meta at runtime,
 * so they are `unknown` here; narrow with the MetaField's type.
 * - `_refs`: only when the row has a nameable reference, keyed by field name.
 * - `_meta`: on single-record answers (GET, POST, PATCH, /new), not on lists.
 * - Documents carry each collection's lines under its name (`lines: Row[]`).
 */
export interface Row {
  [field: string]: unknown
  _refs?: Record<string, RefTitle>
  _meta?: RecordMeta | NewRecordMeta
}

/** Server-managed on every row: never send them (READ_ONLY), except `version` on update. */
export const SERVER_MANAGED_FIELDS = [
  'id',
  'version',
  'createdAt',
  'createdBy',
  'updatedAt',
  'updatedBy',
  'deletedAt'
] as const

export function isNewRecordMeta(m: Row['_meta']): m is NewRecordMeta {
  return !!m && (m as NewRecordMeta).new === true
}

/** Is this field frozen by the record's state? */
export function isLocked(meta: RecordMeta | undefined, field: string): boolean {
  return !!meta && (meta.locked.includes('*') || meta.locked.includes(field))
}

// ---------------------------------------------------------------------------
// QUERY (API_GUIDE section 6)
// ---------------------------------------------------------------------------

export interface Condition {
  /** A field, or a relation path: "category.code", "createdByUser.userNo". */
  field: string
  op: OperatorName
  /**
   * Scalar for most operators; array (1 to 100) for "in"; boolean for
   * "isNull". Decimals as strings.
   */
  value: unknown
}

/** Nest up to 4 levels, at most 20 conditions. */
export type FilterNode =
  Condition | { and: FilterNode[] } | { or: FilterNode[] } | { not: FilterNode }

/** Every part optional; {} means "first 50 rows, the resource's own order". */
export interface QuerySpec {
  where?: FilterNode
  /** At most 3 keys; ties broken by id. */
  sort?: SortKey[]
  /** limit 1 to 200 (default 50), offset >= 0. */
  page?: { limit?: number; offset?: number }
  /** At most 100 characters: title starts with, or subtitle contains. */
  search?: string
}

export interface PageInfo {
  limit: number
  offset: number
  /** Another page follows. There is no total count. */
  hasMore: boolean
}

export interface ListResponse<T = Row> {
  data: T[]
  page: PageInfo
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/** POST {path}: the new row's writable fields (and, for documents, each collection's lines). */
export type CreateBody = Record<string, unknown>

/** PATCH {path}/{id}: the version last read and only the changed fields. */
export interface UpdateBody {
  version: number
  [field: string]: unknown
}

/**
 * A document line in a write: with `id` it is updated (only the fields sent),
 * without it is added. A stored line left out of a sent collection is removed;
 * a collection left out of a PATCH keeps its lines.
 */
export interface DocumentLineBody {
  id?: Id
  [field: string]: unknown
}

/** POST {path}/calculate and POST {path}/{id}/calculate: nothing is saved. */
export interface CalculateResponse {
  document: Row
  /** Non-blocking, translated. */
  warnings: FieldError[]
  /** What a save would report now. */
  errors: FieldError[]
}

// ---------------------------------------------------------------------------
// History (API_GUIDE section 5, "History")
// ---------------------------------------------------------------------------

export interface FieldChange {
  old: unknown
  new: unknown
}

/** A field the caller may not read: it changed, to what is hidden. */
export interface MaskedChange {
  masked: true
}

/** A document collection's changes in one save. */
export interface CollectionChange {
  added?: Row[]
  /** By line id: field -> change. */
  changed?: Record<string, Record<string, FieldChange | MaskedChange>>
  removed?: Id[]
}

export interface HistoryEntry {
  id: Id
  /** CREATED, UPDATED, DELETED, POSTED... */
  action: string
  occurredAt: Instant
  user: { id: Id; userNo: string; name: string }
  requestId?: string
  /** Only fields whose value really changed. DELETED carries none. */
  changes?: Record<string, FieldChange | MaskedChange | CollectionChange>
  /** Translated; generic histories only (not the hand-written GL / scheduler ones yet). */
  actionLabel?: string
  /** Field name -> translated label, for the changed fields. */
  labels?: Record<string, string>
}

export function isMaskedChange(c: unknown): c is MaskedChange {
  return typeof c === 'object' && c !== null && (c as MaskedChange).masked === true
}

// ---------------------------------------------------------------------------
// Request headers the client sends
// ---------------------------------------------------------------------------

export interface ApiHeaders {
  /** Never on POST /auth/login. */
  Authorization?: `Bearer ${string}`
  /** Required when the user has several companies and no default. */
  'X-Company-Id'?: string
  /** Echoed back; printed on every server log line. */
  'X-Request-Id'?: string
  /** For documents posted as they are created. */
  'Idempotency-Key'?: string
  /** GET /meta: a 304 until the answer changes. */
  'If-None-Match'?: string
}
