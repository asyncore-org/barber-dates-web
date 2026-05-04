import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { repositories } from '@/infrastructure'
import type { CreateServiceData, UpdateServiceData } from '@/domain/service'
import { queryKeys, STALE } from './queryKeys'

export function useServices() {
  return useQuery({
    queryKey: queryKeys.services.list(),
    queryFn: () => repositories.services().getActive(),
    staleTime: STALE.LONG,
  })
}

export function useAllServices() {
  return useQuery({
    queryKey: queryKeys.services.admin(),
    queryFn: () => repositories.services().getAll(),
    staleTime: STALE.LONG,
  })
}

export function useCreateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateServiceData) => repositories.services().create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.services.all() }),
  })
}

export function useUpdateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateServiceData }) =>
      repositories.services().update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.services.all() }),
  })
}

export function useDeleteService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repositories.services().delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.services.all() }),
  })
}

export function useReactivateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repositories.services().reactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.services.all() }),
  })
}

export function useSoftDeleteService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repositories.services().softDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.services.all() }),
  })
}
