import { describe, it, expect } from 'vitest'
import { getMaxBookingDate, getAvailableBarbersForDate, getBarbersAvailableForSlot } from './index'
import type { Barber } from '@/domain/barber'
import type { WeeklySchedule, ScheduleBlock } from '@/domain/schedule'

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

const ALL_BARBERS: Barber[] = [
  { id: 'b1', fullName: 'Gio Valentino',  role: null, phone: null, email: null, bio: null, avatarUrl: null, specialtyIds: [], isActive: true,  breakStart: null, breakEnd: null },
  { id: 'b2', fullName: 'Marcos Castaño', role: null, phone: null, email: null, bio: null, avatarUrl: null, specialtyIds: [], isActive: true,  breakStart: null, breakEnd: null },
  { id: 'b3', fullName: 'Lucía Pérez',    role: null, phone: null, email: null, bio: null, avatarUrl: null, specialtyIds: [], isActive: false, breakStart: null, breakEnd: null },
]

const SCHEDULE: WeeklySchedule = {
  mon: { open: false, from: '',      to: '',      barberIds: [] },
  tue: { open: true,  from: '10:00', to: '20:00', barberIds: ['b1', 'b2'] },
  wed: { open: true,  from: '10:00', to: '20:00', barberIds: ['b1', 'b2'] },
  thu: { open: true,  from: '10:00', to: '20:00', barberIds: ['b1', 'b2'] },
  fri: { open: true,  from: '10:00', to: '21:00', barberIds: ['b1', 'b2'] },
  sat: { open: true,  from: '09:00', to: '15:00', barberIds: ['b1'] },
  sun: { open: false, from: '',      to: '',      barberIds: [] },
}

const NO_BLOCKS: ScheduleBlock[] = []

function date(y: number, m: number, d: number) {
  return new Date(y, m - 1, d)
}

describe('getAvailableBarbersForDate', () => {
  it('returns barbers from weekly schedule for a normal open day (Tuesday)', () => {
    // 2026-04-28 is a Tuesday
    const result = getAvailableBarbersForDate(date(2026, 4, 28), SCHEDULE, NO_BLOCKS, ALL_BARBERS)
    expect(result.map(b => b.id)).toEqual(['b1', 'b2'])
  })

  it('returns only b1 on Saturday', () => {
    // 2026-05-02 is a Saturday
    const result = getAvailableBarbersForDate(date(2026, 5, 2), SCHEDULE, NO_BLOCKS, ALL_BARBERS)
    expect(result.map(b => b.id)).toEqual(['b1'])
  })

  it('returns [] for a closed day (Monday)', () => {
    // 2026-04-27 is a Monday
    const result = getAvailableBarbersForDate(date(2026, 4, 27), SCHEDULE, NO_BLOCKS, ALL_BARBERS)
    expect(result).toHaveLength(0)
  })

  it('returns [] for a total closure block', () => {
    const blocks: ScheduleBlock[] = [
      { id: '1', barberId: null, blockDate: '2026-05-01', startTime: null, endTime: null, dayOfWeek: null, reason: 'Día del trabajador', isRecurring: false },
    ]
    // 2026-05-01 is a Friday — normally open, but total closure block
    const result = getAvailableBarbersForDate(date(2026, 5, 1), SCHEDULE, blocks, ALL_BARBERS)
    expect(result).toHaveLength(0)
  })

  it('removes individually blocked barbers, leaving the rest available', () => {
    const blocks: ScheduleBlock[] = [
      // b2 is blocked on 2026-12-24 (Thursday — normally b1+b2)
      { id: '2', barberId: 'b2', blockDate: '2026-12-24', startTime: null, endTime: null, dayOfWeek: null, reason: 'Nochebuena', isRecurring: false },
    ]
    const result = getAvailableBarbersForDate(date(2026, 12, 24), SCHEDULE, blocks, ALL_BARBERS)
    expect(result.map(b => b.id)).toEqual(['b1'])
  })

  it('excludes inactive barbers even if listed in the weekly schedule', () => {
    const scheduleWithB3: WeeklySchedule = {
      ...SCHEDULE,
      fri: { open: true, from: '10:00', to: '21:00', barberIds: ['b1', 'b3'] },
    }
    // 2026-05-15 is a Friday
    const result = getAvailableBarbersForDate(date(2026, 5, 15), scheduleWithB3, NO_BLOCKS, ALL_BARBERS)
    // b3 is inactive — must be excluded
    expect(result.map(b => b.id)).toEqual(['b1'])
  })

  it('returns [] for Sunday (closed day)', () => {
    // 2026-05-03 is a Sunday
    const result = getAvailableBarbersForDate(date(2026, 5, 3), SCHEDULE, NO_BLOCKS, ALL_BARBERS)
    expect(result).toHaveLength(0)
  })
})

// ─── getBarbersAvailableForSlot ─────────────────────────────────────────────

const BARBER_WITH_BREAK: Barber = {
  id: 'b1', fullName: 'Gio', role: null, phone: null, email: null, bio: null,
  avatarUrl: null, specialtyIds: [], isActive: true, breakStart: '14:00', breakEnd: '15:00',
}
const BARBER_NO_BREAK: Barber = {
  id: 'b2', fullName: 'Marcos', role: null, phone: null, email: null, bio: null,
  avatarUrl: null, specialtyIds: [], isActive: true, breakStart: null, breakEnd: null,
}

describe('getBarbersAvailableForSlot', () => {
  it('includes barber without break for any slot', () => {
    const result = getBarbersAvailableForSlot('14:00', 30, [BARBER_NO_BREAK])
    expect(result).toHaveLength(1)
  })

  it('excludes barber whose break fully covers the slot', () => {
    const result = getBarbersAvailableForSlot('14:00', 30, [BARBER_WITH_BREAK])
    expect(result).toHaveLength(0)
  })

  it('excludes barber when slot starts inside break window', () => {
    const result = getBarbersAvailableForSlot('14:30', 30, [BARBER_WITH_BREAK])
    expect(result).toHaveLength(0)
  })

  it('excludes barber when slot overlaps start of break', () => {
    // Slot 13:31-14:01 overlaps break 14:00-15:00
    const result = getBarbersAvailableForSlot('13:31', 30, [BARBER_WITH_BREAK])
    expect(result).toHaveLength(0)
  })

  it('includes barber when slot ends exactly at break start', () => {
    // Slot 13:30-14:00 ends exactly when break starts — no overlap (boundary is exclusive)
    const result = getBarbersAvailableForSlot('13:30', 30, [BARBER_WITH_BREAK])
    expect(result).toHaveLength(1)
  })

  it('includes barber for slot before break', () => {
    const result = getBarbersAvailableForSlot('13:00', 30, [BARBER_WITH_BREAK])
    expect(result).toHaveLength(1)
  })

  it('includes barber for slot after break', () => {
    const result = getBarbersAvailableForSlot('15:00', 30, [BARBER_WITH_BREAK])
    expect(result).toHaveLength(1)
  })

  it('returns mixed result: one available, one blocked', () => {
    const result = getBarbersAvailableForSlot('14:00', 30, [BARBER_WITH_BREAK, BARBER_NO_BREAK])
    expect(result.map(b => b.id)).toEqual(['b2'])
  })
})
