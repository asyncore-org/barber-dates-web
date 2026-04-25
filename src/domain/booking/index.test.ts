import { describe, it, expect } from 'vitest'
import { getMaxBookingDate } from './index'

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
