import {
  ADMIN_SESSION_MAX_DAYS,
  isAdminSessionExpired,
  parseAdminLoginTimestamp,
  shouldForceAdminLogout,
} from './index'

describe('domain/user session rules', () => {
  const DAY_MS = 24 * 60 * 60 * 1000

  it('isAdminSessionExpired returns false at exact 15-day boundary', () => {
    const now = Date.UTC(2026, 0, 31)
    const login = now - ADMIN_SESSION_MAX_DAYS * DAY_MS

    expect(isAdminSessionExpired(login, now)).toBe(false)
  })

  it('isAdminSessionExpired returns true after 15 days + 1ms', () => {
    const now = Date.UTC(2026, 0, 31)
    const login = now - ADMIN_SESSION_MAX_DAYS * DAY_MS - 1

    expect(isAdminSessionExpired(login, now)).toBe(true)
  })

  it('parseAdminLoginTimestamp returns null for missing or invalid values', () => {
    expect(parseAdminLoginTimestamp(null)).toBeNull()
    expect(parseAdminLoginTimestamp('not-a-number')).toBeNull()
  })

  it('shouldForceAdminLogout returns true for missing or invalid timestamps', () => {
    expect(shouldForceAdminLogout(null, Date.UTC(2026, 0, 1))).toBe(true)
    expect(shouldForceAdminLogout('invalid', Date.UTC(2026, 0, 1))).toBe(true)
  })

  it('shouldForceAdminLogout returns false for valid recent timestamp', () => {
    const now = Date.UTC(2026, 0, 10)
    const login = now - 2 * DAY_MS

    expect(shouldForceAdminLogout(String(login), now)).toBe(false)
  })
})
