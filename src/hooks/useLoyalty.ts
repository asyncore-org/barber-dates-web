import { useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { repositories } from '@/infrastructure'
import type { CreateRewardData, UpdateRewardData } from '@/domain/loyalty'
import type { LoyaltyConfig } from '@/domain/shop'
import type { Appointment } from '@/domain/appointment'
import { queryKeys, STALE } from './queryKeys'

export function useLoyaltyCard(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.loyalty.byUser(userId ?? ''),
    queryFn: () => repositories.loyalty().getCardForClient(userId!),
    enabled: !!userId,
    staleTime: STALE.LOYALTY,
  })
}

export function useRewards() {
  return useQuery({
    queryKey: queryKeys.rewards.active(),
    queryFn: () => repositories.loyalty().getActiveRewards(),
    staleTime: STALE.LONG,
  })
}

export function useAllRewards() {
  return useQuery({
    queryKey: queryKeys.rewards.all(),
    queryFn: () => repositories.loyalty().getAllRewards(),
    staleTime: STALE.LONG,
  })
}

export function useRedeemedRewardIds(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.loyalty.redeemed(userId ?? ''),
    queryFn: () => repositories.loyalty().getRedeemedRewardIds(userId!),
    enabled: !!userId,
    staleTime: STALE.LOYALTY,
  })
}

export function useRedeemReward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ clientId, rewardId, cost }: { clientId: string; rewardId: string; cost: number }) =>
      repositories.loyalty().redeemReward(clientId, rewardId, cost),
    onSuccess: (_data, { clientId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.loyalty.redeemed(clientId) })
      qc.invalidateQueries({ queryKey: queryKeys.loyalty.byUser(clientId) })
    },
  })
}

export function useCreateReward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRewardData) => repositories.loyalty().createReward(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.rewards.all() }),
  })
}

export function useUpdateReward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRewardData }) =>
      repositories.loyalty().updateReward(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.rewards.all() }),
  })
}

export function useDeleteReward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repositories.loyalty().deleteReward(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.rewards.all() }),
  })
}

/**
 * Fires awardPointsForAppointment for every confirmed appointment whose end
 * time has passed. Idempotent: the repository skips appointments already
 * recorded in loyalty_transactions. A session-level ref prevents duplicate
 * calls within the same browser session.
 */
export function useAutoAwardPoints(appointments: Appointment[]) {
  const awarded = useRef(new Set<string>())
  const qc = useQueryClient()

  useEffect(() => {
    const now = new Date().getTime()
    const toAward = appointments.filter(
      a => a.status === 'confirmed' &&
        new Date(a.endTime).getTime() < now &&
        !awarded.current.has(a.id),
    )
    if (toAward.length === 0) return

    toAward.forEach(a => awarded.current.add(a.id))

    void Promise.all(
      toAward.map(a =>
        repositories.loyalty().awardPointsForAppointment(a.id, a.clientId, a.serviceId),
      ),
    ).then(() => {
      qc.invalidateQueries({ queryKey: queryKeys.loyalty.all() })
    }).catch(() => {
      toAward.forEach(a => awarded.current.delete(a.id))
    })
  }, [appointments, qc])
}

/** Cancels an appointment and deducts loyalty points if the appointment has already passed. */
export function useCancelAppointmentWithDeduction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, endTime, clientId }: { id: string; endTime: string; clientId: string }) => {
      await repositories.appointments().cancel(id)
      if (new Date(endTime).getTime() < new Date().getTime()) {
        await repositories.loyalty().deductPointsForAppointment(id, clientId)
      }
    },
    onSuccess: (_data, { clientId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.appointments.all() })
      qc.invalidateQueries({ queryKey: queryKeys.loyalty.byUser(clientId) })
    },
  })
}

/** Bulk query for loyalty cards keyed by clientId — used in calendar views. */
export function useLoyaltyCardsForClients(clientIds: string[]) {
  const key = clientIds.slice().sort().join(',')
  return useQuery({
    queryKey: ['loyalty', 'cards', key],
    queryFn: () => repositories.loyalty().getLoyaltyCardsForClients(clientIds),
    enabled: clientIds.length > 0,
    staleTime: STALE.LOYALTY,
  })
}

export function useUpdateLoyaltyConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (config: Partial<LoyaltyConfig>) =>
      repositories.shop().updateLoyaltyConfig(config),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.shop.loyalty() }),
  })
}
