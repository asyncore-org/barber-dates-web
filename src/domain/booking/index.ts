import type { Barber } from '@/domain/barber'
import type { WeeklySchedule, DayKey, ScheduleBlock } from '@/domain/schedule'

export function getMaxBookingDate(daysAhead: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + daysAhead)
  return d
}

// Maps JS Date.getDay() (0=Sunday, 1=Monday…) to WeeklySchedule DayKey
const JS_DOW_TO_DAY_KEY: Record<number, DayKey> = {
  1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 0: 'sun',
}

/**
 * Returns active barbers available on a given date.
 *
 * Logic:
 *  1. If there is a total shop closure block for the date (barberId=null, no time range) → []
 *  2. If the weekly schedule has the day closed → []
 *  3. Otherwise, take barbers from the weekly schedule and remove any
 *     individually blocked on that date.
 */
export function getAvailableBarbersForDate(
  date: Date,
  schedule: WeeklySchedule,
  blocks: ScheduleBlock[],
  allBarbers: Barber[],
): Barber[] {
  const iso = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')

  // Total shop closure: block with no specific barber and no time range
  const totalClosure = blocks.find(
    b => !b.isRecurring && b.blockDate === iso && b.barberId === null && b.startTime === null,
  )
  if (totalClosure) return []

  const dayKey = JS_DOW_TO_DAY_KEY[date.getDay()]
  const daySchedule = dayKey ? schedule[dayKey] : undefined
  if (!daySchedule?.open) return []

  // Individual barber blocks for this date
  const blockedIds = new Set(
    blocks
      .filter(b => !b.isRecurring && b.blockDate === iso && b.barberId !== null)
      .map(b => b.barberId as string),
  )

  return allBarbers.filter(
    b => b.isActive && daySchedule.barberIds.includes(b.id) && !blockedIds.has(b.id),
  )
}

/** Returns barbers from the given list who are NOT on break during [slotTime, slotTime+durationMin). */
export function getBarbersAvailableForSlot(
  slotTime: string,
  durationMin: number,
  barbers: Barber[],
): Barber[] {
  const [slotH, slotM] = slotTime.split(':').map(Number)
  const slotStart = slotH * 60 + slotM
  const slotEnd = slotStart + durationMin

  return barbers.filter(b => {
    if (!b.breakStart || !b.breakEnd) return true
    const [bsH, bsM] = b.breakStart.split(':').map(Number)
    const [beH, beM] = b.breakEnd.split(':').map(Number)
    const breakStart = bsH * 60 + bsM
    const breakEnd = beH * 60 + beM
    // Slot overlaps break if slot starts before break ends AND slot ends after break starts
    return slotStart >= breakEnd || slotEnd <= breakStart
  })
}
