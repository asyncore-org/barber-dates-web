import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { repositories } from '@/infrastructure'
import type { CreateAppointmentData, AppointmentStatus } from '@/domain/appointment'
import { queryKeys, STALE } from './queryKeys'

/** Client view: returns appointments for the given user */
export function useClientAppointments(clientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.appointments.list(clientId ?? ''),
    queryFn: () => repositories.appointments().getForClient(clientId!),
    enabled: !!clientId,
    staleTime: STALE.MEDIUM,
  })
}

/** Admin view: returns all appointments, polls every 30 s */
export function useAllAppointments() {
  return useQuery({
    queryKey: queryKeys.appointments.all(),
    queryFn: () => repositories.appointments().getAll(),
    staleTime: STALE.MEDIUM,
    refetchInterval: 30_000,
  })
}

export function useCreateAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAppointmentData) =>
      repositories.appointments().create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.appointments.all() }),
  })
}

export function useCancelAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repositories.appointments().cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.appointments.all() }),
  })
}

export function useUpdateAppointmentStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      repositories.appointments().updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.appointments.all() }),
  })
}

export function useFindProfileByEmail() {
  return useCallback(
    (email: string) => repositories.profiles().findByEmail(email),
    [],
  )
}
