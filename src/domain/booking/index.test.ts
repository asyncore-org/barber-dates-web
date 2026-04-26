import { describe, it, expect } from 'vitest'
import { getMaxBookingDate, getAvailableBarbersForDate } from './index'
import type { AvailabilityBarber, AvailabilityHourEntry, AvailabilityClosure } from './index'

describe('getMaxBookingDate', () => {
  it('daysAhead=0 returns today at midnight', () => {
    const result = getMaxBookingDate(0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    expect(result.getTime()).toBe(today.getTime())
  })

  it('daysAhead=14 returns a date 14 days from today', () => {
    const result = getMaxBookingDate(14)
    const expected = new Date()
    expected.setHours(0, 0, 0, 0)
    expected.setDate(expected.getDate() + 14)
    expect(result.getTime()).toBe(expected.getTime())
  })

  it('returns midnight (hours=0)', () => {
    const result = getMaxBookingDate(7)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
  })
})

// ─── getAvailableBarbersForDate ─────────────────────────────────────────────

const ALL_BARBERS: AvailabilityBarber[] = [
  { id: 'b1', name: 'Gio',    role: 'Maestro', initials: 'GV', active: true },
  { id: 'b2', name: 'Marcos', role: 'Barbero', initials: 'MC', active: true },
  { id: 'b3', name: 'Lucía',  role: 'Barbera', initials: 'LP', active: false },
]

// Mon=1 Tue=2 … Sat=6 Sun=0 in JS — MOCK_HOURS index: Mon=0 … Sun=6
const HOURS: AvailabilityHourEntry[] = [
  { open: false, barberIds: [] },              // 0 Lunes
  { open: true,  barberIds: ['b1', 'b2'] },    // 1 Martes
  { open: true,  barberIds: ['b1', 'b2'] },    // 2 Miércoles
  { open: true,  barberIds: ['b1', 'b2'] },    // 3 Jueves
  { open: true,  barberIds: ['b1', 'b2'] },    // 4 Viernes
  { open: true,  barberIds: ['b1'] },          // 5 Sábado
  { open: false, barberIds: [] },              // 6 Domingo
]

const NO_CLOSURES: AvailabilityClosure[] = []

function date(y: number, m: number, d: number) {
  return new Date(y, m - 1, d)
}

describe('getAvailableBarbersForDate', () => {
  it('returns barbers from weekly schedule for a normal open day (Martes)', () => {
    // 2026-04-28 is a Tuesday
    const result = getAvailableBarbersForDate(date(2026, 4, 28), HOURS, NO_CLOSURES, ALL_BARBERS)
    expect(result.map(b => b.id)).toEqual(['b1', 'b2'])
  })

  it('returns only b1 on Saturday (solo Gio)', () => {
    // 2026-05-02 is a Saturday
    const result = getAvailableBarbersForDate(date(2026, 5, 2), HOURS, NO_CLOSURES, ALL_BARBERS)
    expect(result.map(b => b.id)).toEqual(['b1'])
  })

  it('returns [] for a closed day (Lunes)', () => {
    // 2026-04-27 is a Monday
    const result = getAvailableBarbersForDate(date(2026, 4, 27), HOURS, NO_CLOSURES, ALL_BARBERS)
    expect(result).toHaveLength(0)
  })

  it('returns [] for a total closure', () => {
    const closures: AvailabilityClosure[] = [
      { date: '01 May 2026', all: true },
    ]
    const result = getAvailableBarbersForDate(date(2026, 5, 1), HOURS, closures, ALL_BARBERS)
    expect(result).toHaveLength(0)
  })

  it('uses closure barberIds for a partial closure, overriding weekly schedule', () => {
    const closures: AvailabilityClosure[] = [
      { date: '24 Dic 2026', all: false, barberIds: ['b1'] },
    ]
    // 2026-12-24 is a Thursday — weekly would return b1+b2, closure overrides to b1 only
    const result = getAvailableBarbersForDate(date(2026, 12, 24), HOURS, closures, ALL_BARBERS)
    expect(result.map(b => b.id)).toEqual(['b1'])
  })

  it('excludes inactive barbers even if listed in barberIds', () => {
    const closures: AvailabilityClosure[] = [
      { date: '15 May 2026', all: false, barberIds: ['b1', 'b3'] },
    ]
    const result = getAvailableBarbersForDate(date(2026, 5, 15), HOURS, closures, ALL_BARBERS)
    // b3 is inactive — should be excluded
    expect(result.map(b => b.id)).toEqual(['b1'])
  })
})
