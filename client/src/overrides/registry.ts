import type { ComponentType } from 'react'
import type { MetaResource, ResourceKey, Row } from '../api/types'
import type { TextKey } from '../platform/i18n'
import { RolePermissionsPanel } from './RolePermissionsPanel'

/**
 * Screens the generic ones cannot express, keyed by resource key. Keep this
 * nearly empty: every entry needs a comment saying why the generic screen
 * does not do.
 *
 * Planned: glJournalEntry record (manual entry form; can.create is false and
 * its body names accounts by accountNo, lines by debit / credit, see
 * API_GUIDE section 9).
 */
export interface ResourceOverride {
  list?: ComponentType<{ resource: MetaResource }>
  /** One more tab on a stored record, after Details. */
  recordTab?: { name: string; label: TextKey; panel: ComponentType<RecordPanelProps> }
  /** Action params to type in a masked input, by action name. */
  secretParams?: Record<string, string[]>
}

export interface RecordPanelProps {
  resource: MetaResource
  /** The record as last read or saved. */
  record: Row
  /** The record's form has unsaved changes: a write of the panel's own would clash. */
  dirty: boolean
  /** The panel wrote the record: read it again (its version moved). */
  onChanged: () => void
}

export const overrides: Partial<Record<ResourceKey, ResourceOverride>> = {
  user: {
    // /meta has no "secret" marker on action params yet, so the generic dialog
    // would show the new password in clear. Drop this once the server marks it.
    secretParams: { setPassword: ['password'] }
  },
  role: {
    // A role's permissions are rows, not a field, so no layout can show them.
    // They have their own read (GET /access/roles/{id}/permissions, with the
    // role's version) and are written with PATCH { version, permissions }.
    // API_GUIDE section 12.
    recordTab: { name: 'permissions', label: 'permissions', panel: RolePermissionsPanel }
  }
}

export function isSecretParam(resource: ResourceKey, action: string, param: string): boolean {
  return overrides[resource]?.secretParams?.[action]?.includes(param) ?? false
}
