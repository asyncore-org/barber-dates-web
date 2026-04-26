export function getMaxBookingDate(daysAhead: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + daysAhead)
  return d
}

// Day-of-week index used by MOCK_HOURS: 0=Lunes … 6=Domingo
// JS Date.getDay(): 0=Sunday, 1=Monday … 6=Saturday
const JS_DOW_TO_HOURS_IDX: Record<number, number> = {
  1: 0, // Monday
  2: 1, // Tuesday
  3: 2, // Wednesday
  4: 3, // Thursday
  5: 4, // Friday
  6: 5, // Saturday
  0: 6, // Sunday
}

export interface AvailabilityBarber {
  id: string
  name: string
  role: string
  initials: string
  active: boolean
}

export interface AvailabilityHourEntry {
  open: boolean
  barberIds: string[]
}

export interface AvailabilityClosure {
  date: string
  all: boolean
  barberIds?: string[]
}

/**
 * Returns the list of barbers available on a given date, in display order.
 *
 * Priority:
 *  1. If there is a partial special closure for the date → use closure.barberIds (override).
 *  2. If there is a total closure → return [] (shop is closed).
 *  3. Otherwise → use barberIds from the weekly schedule for that day of week.
 *
 * Only returns active barbers whose id is in the resolved list.
 */
export function getAvailableBarbersForDate(
  date: Date,
  hours: AvailabilityHourEntry[],
  closures: AvailabilityClosure[],
  allBarbers: AvailabilityBarber[],
): AvailabilityBarber[] {
  const day = date.getDate()
  const month = date.getMonth()
  const year = date.getFullYear()

  const matchingClosure = closures.find(c => {
    // closures use formatted strings like "01 May 2026" — try JS Date parse first
    const ref = new Date(c.date)
    if (!isNaN(ref.getTime())) {
      return ref.getDate() === day && ref.getMonth() === month && ref.getFullYear() === year
    }
    // Fallback: "DD Mes YYYY" → "Mes DD, YYYY"
    const parts = c.date.split(' ')
    if (parts.length >= 3) {
      const testDate = new Date(`${parts[1]} ${parts[0]}, ${parts[2]}`)
      return testDate.getDate() === day && testDate.getMonth() === month && testDate.getFullYear() === year
    }
    return false
  })

  let resolvedIds: string[]

  if (matchingClosure) {
    if (matchingClosure.all) return []
    resolvedIds = matchingClosure.barberIds ?? []
  } else {
    const dowIdx = JS_DOW_TO_HOURS_IDX[date.getDay()] ?? -1
    const entry = dowIdx >= 0 ? hours[dowIdx] : undefined
    if (!entry?.open) return []
    resolvedIds = entry.barberIds
  }

  return allBarbers.filter(b => b.active && resolvedIds.includes(b.id))
}
