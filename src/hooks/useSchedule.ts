import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { repositories } from '@/infrastructure'
import type { WeeklySchedule, ScheduleBlock } from '@/domain/schedule'
import { DEFAULT_WEEKLY_SCHEDULE } from '@/domain/schedule'
import { queryKeys, STALE } from './queryKeys'

export function useWeeklySchedule() {
  return useQuery({
    queryKey: queryKeys.schedule.weekly(),
    queryFn: async () => {
      const schedule = await repositories.schedule().getWeeklySchedule()
      return schedule ?? DEFAULT_WEEKLY_SCHEDULE
    },
    staleTime: STALE.LONG,
  })
}

export function useScheduleBlocks() {
  return useQuery({
    queryKey: queryKeys.schedule.blocks(),
    queryFn: () => repositories.schedule().getBlocks(),
    staleTime: STALE.LONG,
  })
}

export function useMutateWeeklySchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (schedule: WeeklySchedule) =>
      repositories.schedule().upsertWeeklySchedule(schedule),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.schedule.weekly() }),
  })
}

export function useAddScheduleBlock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (block: Omit<ScheduleBlock, 'id'>) =>
      repositories.schedule().upsertBlock(block),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.schedule.blocks() }),
  })
}

export function useDeleteScheduleBlock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repositories.schedule().deleteBlock(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.schedule.blocks() }),
  })
}
