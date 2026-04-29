export type UserRole = 'client' | 'admin' | 'owner' | 'barber'

export interface Profile {
  id: string
  email: string
}

export interface User {
  id: string
  email: string
  fullName: string
  role: UserRole
  phone?: string
  avatarUrl?: string
}

export interface UpdateProfileData {
  fullName?: string
  phone?: string
}

export const ADMIN_SESSION_MAX_DAYS = 15
export const ADMIN_LOGIN_TIME_KEY = 'admin_login_time'

/**
 * Pure function — receives the timestamp stored in localStorage.
 * Returns true if more than ADMIN_SESSION_MAX_DAYS have passed since login.
 */
export function isAdminSessionExpired(loginTimestamp: number, nowTimestamp: number = Date.now()): boolean {
  const elapsed = nowTimestamp - loginTimestamp
  return elapsed > ADMIN_SESSION_MAX_DAYS * 24 * 60 * 60 * 1000
}

export function parseAdminLoginTimestamp(rawTimestamp: string | null): number | null {
  if (!rawTimestamp) return null
  const parsed = Number.parseInt(rawTimestamp, 10)
  return Number.isNaN(parsed) ? null : parsed
}

export function shouldForceAdminLogout(
  rawTimestamp: string | null,
  nowTimestamp: number = Date.now()
): boolean {
  const parsed = parseAdminLoginTimestamp(rawTimestamp)
  if (parsed === null) return true
  return isAdminSessionExpired(parsed, nowTimestamp)
}
