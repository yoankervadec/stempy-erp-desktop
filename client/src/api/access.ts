import { call, callJson } from './client'
import type { ChangePasswordRequest, Id, PermissionView, RolePermissions } from './types'

/** Access administration (API_GUIDE section 12) and the user's own password (section 4). */

export async function listPermissions(): Promise<PermissionView[]> {
  return (
    await callJson<{ data: PermissionView[] }>({ method: 'GET', path: '/access/permissions' })
  ).data
}

export function getRolePermissions(rolePath: string, id: Id): Promise<RolePermissions> {
  return callJson<RolePermissions>({ method: 'GET', path: `${rolePath}/${id}/permissions` })
}

export async function changeOwnPassword(body: ChangePasswordRequest): Promise<void> {
  await call({ method: 'POST', path: '/auth/me/password', body })
}
