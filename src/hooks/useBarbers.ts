import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { repositories } from '@/infrastructure'
import type { CreateBarberData, UpdateBarberData } from '@/domain/barber'
import { queryKeys, STALE } from './queryKeys'

export function useBarbers() {
  return useQuery({
    queryKey: queryKeys.barbers.list(),
    queryFn: () => repositories.barbers().getActive(),
    staleTime: STALE.LONG,
  })
}

export function useAllBarbers() {
  return useQuery({
    queryKey: queryKeys.barbers.admin(),
    queryFn: () => repositories.barbers().getAll(),
    staleTime: STALE.LONG,
  })
}

export function useCreateBarber() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateBarberData) => repositories.barbers().create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.barbers.all() }),
  })
}

export function useUpdateBarber() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBarberData }) =>
      repositories.barbers().update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.barbers.all() }),
  })
}

export function useDeleteBarber() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repositories.barbers().delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.barbers.all() }),
  })
}
