export type UserRole = 'client' | 'admin'

export interface User {
  id: string
  email: string
  fullName: string
  role: UserRole
  phone?: string
  avatarUrl?: string
}

export const ADMIN_SESSION_MAX_DAYS = 15
export const ADMIN_LOGIN_TIME_KEY = 'admin_login_time'

/**
 * Pure function — receives the timestamp stored in localStorage.
 * Returns true if more than ADMIN_SESSION_MAX_DAYS have passed since login.
 */
export function isAdminSessionExpired(loginTimestamp: number): boolean {
  const elapsed = Date.now() - loginTimestamp
  return elapsed > ADMIN_SESSION_MAX_DAYS * 24 * 60 * 60 * 1000
}
