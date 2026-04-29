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

export function useAddBarberByEmail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (email: string) => {
      const profile = await repositories.profiles().findByEmailFull(email)
      if (!profile) throw new Error('Email no registrado')
      // Role update first — if create fails, the role is already correct and the
      // owner can retry (create is idempotent in intent; role stays 'barber').
      if (profile.role === 'client') {
        await repositories.profiles().updateRole(profile.id, 'barber')
      }
      await repositories.barbers().create({ fullName: profile.fullName ?? email.split('@')[0], email })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.barbers.all() })
      qc.invalidateQueries({ queryKey: ['admin', 'profiles'] })
    },
  })
}
