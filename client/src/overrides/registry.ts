import type { ComponentType } from 'react'
import type { MetaResource, ResourceKey } from '../api/types'

/**
 * Screens the generic ones cannot express, keyed by resource key. Keep this
 * nearly empty: every entry needs a comment saying why the generic screen
 * does not do. Record and per-field overrides join when those screens exist.
 *
 * Planned: glJournalEntry record (manual entry form; can.create is false and
 * its body names accounts by accountNo, lines by debit / credit, see
 * API_GUIDE section 9).
 */
export interface ResourceOverride {
  list?: ComponentType<{ resource: MetaResource }>
}

export const overrides: Partial<Record<ResourceKey, ResourceOverride>> = {}
