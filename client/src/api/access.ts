import { call, callJson } from './client'
import type {
  ChangePasswordRequest,
  Id,
  Member,
  MemberPut,
  PermissionView,
  RolePermissions
} from './types'

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

/** The request's company's members, by user number. `path` is the member screen's. */
export async function listMembers(path: string): Promise<Member[]> {
  return (await callJson<{ data: Member[] }>({ method: 'GET', path })).data
}

/** Makes the user a member if they are not one yet. Answers the member as it is now. */
export function putMember(path: string, userId: Id, body: MemberPut): Promise<Member> {
  return callJson<Member>({ method: 'PUT', path: `${path}/${userId}`, body })
}
