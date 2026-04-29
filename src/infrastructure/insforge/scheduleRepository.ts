import type { IScheduleRepository, WeeklySchedule, ScheduleBlock } from '@/domain/schedule'
import { insforgeClient } from './client'

interface ShopConfigRow {
  id: string
  key: string
  value: unknown
}

interface ScheduleBlockRow {
  id: string
  barber_id: string | null
  block_date: string | null
  start_time: string | null
  end_time: string | null
  day_of_week: number | null
  reason: string | null
  is_recurring: boolean
}

function mapToBlock(row: ScheduleBlockRow): ScheduleBlock {
  return {
    id: row.id,
    barberId: row.barber_id,
    blockDate: row.block_date,
    startTime: row.start_time,
    endTime: row.end_time,
    dayOfWeek: row.day_of_week,
    reason: row.reason,
    isRecurring: row.is_recurring,
  }
}

export class InsForgeScheduleRepository implements IScheduleRepository {
  async getWeeklySchedule(): Promise<WeeklySchedule | null> {
    const { data, error } = await insforgeClient.database
      .from('shop_config')
      .select('value')
      .eq('key', 'schedule')
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    return (data as ShopConfigRow).value as WeeklySchedule
  }

  async getBlocks(): Promise<ScheduleBlock[]> {
    const { data, error } = await insforgeClient.database
      .from('schedule_blocks')
      .select('id, barber_id, block_date, start_time, end_time, day_of_week, reason, is_recurring')
      .order('block_date', { ascending: true })
    if (error) throw error
    return ((data ?? []) as ScheduleBlockRow[]).map(mapToBlock)
  }

  async upsertWeeklySchedule(schedule: WeeklySchedule): Promise<void> {
    const { error } = await insforgeClient.database
      .from('shop_config')
      .upsert({ key: 'schedule', value: schedule }, { onConflict: 'key' })
    if (error) throw error
  }

  async upsertBlock(block: Omit<ScheduleBlock, 'id'>): Promise<ScheduleBlock> {
    const { data, error } = await insforgeClient.database
      .from('schedule_blocks')
      .insert({
        barber_id: block.barberId,
        block_date: block.blockDate,
        start_time: block.startTime,
        end_time: block.endTime,
        day_of_week: block.dayOfWeek,
        reason: block.reason,
        is_recurring: block.isRecurring,
      })
      .select()
      .single()
    if (error) throw error
    return mapToBlock(data as ScheduleBlockRow)
  }

  async deleteBlock(id: string): Promise<void> {
    const { error } = await insforgeClient.database
      .from('schedule_blocks')
      .delete()
      .eq('id', id)
    if (error) throw error
  }
}
