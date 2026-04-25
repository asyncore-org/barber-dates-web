export function getMaxBookingDate(daysAhead: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + daysAhead)
  return d
}
