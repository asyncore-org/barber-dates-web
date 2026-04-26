/** ISO weekday key as stored in shop_config key='schedule' */
export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export interface DaySchedule {
  open: boolean
  /** "HH:mm" or empty string */
  from: string
  /** "HH:mm" or empty string */
  to: string
  /** IDs of barbers working this day */
  barberIds: string[]
}

export type WeeklySchedule = Record<DayKey, DaySchedule>

/** A specific block or closure for a date or recurring day-of-week */
export interface ScheduleBlock {
  id: string
  /** null = affects all barbers */
  barberId: string | null
  /** ISO date "YYYY-MM-DD" — null if isRecurring */
  blockDate: string | null
  /** "HH:mm" — null means start of day */
  startTime: string | null
  /** "HH:mm" — null means end of day */
  endTime: string | null
  /** 0=Monday … 6=Sunday (ISO) — null if not recurring */
  dayOfWeek: number | null
  reason: string | null
  isRecurring: boolean
}

export const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  mon: { open: false, from: '', to: '', barberIds: [] },
  tue: { open: false, from: '', to: '', barberIds: [] },
  wed: { open: false, from: '', to: '', barberIds: [] },
  thu: { open: false, from: '', to: '', barberIds: [] },
  fri: { open: false, from: '', to: '', barberIds: [] },
  sat: { open: false, from: '', to: '', barberIds: [] },
  sun: { open: false, from: '', to: '', barberIds: [] },
}

export interface IScheduleRepository {
  getWeeklySchedule(): Promise<WeeklySchedule | null>
  getBlocks(): Promise<ScheduleBlock[]>
  upsertWeeklySchedule(schedule: WeeklySchedule): Promise<void>
  upsertBlock(block: Omit<ScheduleBlock, 'id'>): Promise<ScheduleBlock>
  deleteBlock(id: string): Promise<void>
}
