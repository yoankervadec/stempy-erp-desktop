import type { ComponentType } from 'react'
import type { LayoutTab, MetaResource, MetaScreen, ResourceKey, Row } from '../api/types'
import { MembersScreen } from './MembersScreen'
import { RolePermissionsPanel } from './RolePermissionsPanel'

/**
 * What the client builds itself, keyed by the server's names. Keep this
 * nearly empty: every entry needs a comment saying why the generic screen
 * does not do.
 *
 * Planned: glJournalEntry record (manual entry form; can.create is false and
 * its body names accounts by accountNo, lines by debit / credit, see
 * API_GUIDE section 9).
 */
export interface ResourceOverride {
  list?: ComponentType<{ resource: MetaResource }>
  /**
   * The panels of the custom tabs the layout names (layout.tabs with custom
   * true), by tab name. A custom tab with no panel here is not shown.
   */
  tabs?: Record<string, ComponentType<RecordPanelProps>>
}

export interface RecordPanelProps {
  resource: MetaResource
  /** The tab as /meta describes it: its label and its words (texts). */
  tab: LayoutTab
  /** The record as last read or saved. */
  record: Row
  /** The record's form has unsaved changes: a write of the panel's own would clash. */
  dirty: boolean
  /** The panel wrote the record: read it again (its version moved). */
  onChanged: () => void
}

export const overrides: Partial<Record<ResourceKey, ResourceOverride>> = {
  role: {
    // A role's permissions are rows, not a field, so no section can show them.
    // They have their own read (GET /access/roles/{id}/permissions, with the
    // role's version) and are written with PATCH { version, permissions }.
    // API_GUIDE section 12.
    tabs: { permissions: RolePermissionsPanel }
  }
}

/**
 * The screens of /meta.screens, by key (ARCHITECTURE 23.12). The server names
 * them, gives their words and what the user may do; their routes are their own.
 */
export const screens: Record<string, ComponentType<{ screen: MetaScreen }>> = {
  // The company's members: GET /access/members, PUT /access/members/{userId}.
  member: MembersScreen
}
