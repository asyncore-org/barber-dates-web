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
    staleTime: 0, // always fetch fresh so auto-reset fires immediately
  })
}

export function useRedeemReward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ clientId, rewardId }: { clientId: string; rewardId: string }) =>
      repositories.loyalty().redeemReward(clientId, rewardId),
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

    const runSequential = async () => {
      for (const a of toAward) {
        await repositories.loyalty().awardPointsForAppointment(a.id, a.clientId, a.serviceId)
      }
    }

    void runSequential()
      .then(() => {
        qc.invalidateQueries({ queryKey: queryKeys.loyalty.all() })
      })
      .catch(() => {
        toAward.forEach(a => awarded.current.delete(a.id))
      })
  }, [appointments, qc])
}

/** Cancels an appointment and deducts loyalty points if the appointment has already passed. */
export function useCancelAppointmentWithDeduction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, endTime, clientId }: { id: string; endTime: string; clientId: string }) => {
      await repositories.appointments().updateStatus(id, 'no_show')
      if (new Date(endTime).getTime() < new Date().getTime()) {
        await repositories.loyalty().deductPointsForAppointment(id, clientId)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.appointments.all() })
      qc.invalidateQueries({ queryKey: queryKeys.loyalty.all() })
    },
  })
}

/** Bulk query for loyalty cards keyed by clientId — used in calendar views. */
export function useLoyaltyCardsForClients(clientIds: string[]) {
  const key = clientIds.slice().sort().join(',')
  return useQuery({
    queryKey: queryKeys.loyalty.cards(key),
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

/** Returns the loyalty points status for a specific appointment. */
export function useLoyaltyStatusForAppointment(
  appointmentId: string | undefined,
  clientId: string | undefined,
) {
  return useQuery({
    queryKey: ['loyalty', 'appt-status', appointmentId ?? '', clientId ?? ''],
    queryFn: () => repositories.loyalty().getLoyaltyStatusForAppointment(appointmentId!, clientId!),
    enabled: !!appointmentId && !!clientId,
    staleTime: STALE.LOYALTY,
  })
}

/** Admin explicit award for an appointment — bypasses service config, auto-creates card. */
export function useAdminAwardPoints() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ appointmentId, clientId, points }: { appointmentId: string; clientId: string; points: number }) =>
      repositories.loyalty().adminAwardForAppointment(appointmentId, clientId, points),
    onSuccess: (_d, { clientId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.loyalty.all() })
      qc.invalidateQueries({ queryKey: queryKeys.loyalty.byUser(clientId) })
      qc.invalidateQueries({ queryKey: ['loyalty', 'appt-status'] })
    },
  })
}

/** Fetch service loyalty_points to show as default in admin modal. */
export function useServiceLoyaltyPoints(serviceId: string | undefined) {
  return useQuery({
    queryKey: ['service', 'loyalty-points', serviceId ?? ''],
    queryFn: () => repositories.loyalty().getServiceLoyaltyPoints(serviceId!),
    enabled: !!serviceId,
    staleTime: STALE.LONG,
  })
}

/** Revokes points for an appointment (admin no-show). */
export function useAdminRevokePoints() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ appointmentId, clientId }: { appointmentId: string; clientId: string }) =>
      repositories.loyalty().deductPointsForAppointment(appointmentId, clientId),
    onSuccess: (_d, { clientId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.loyalty.all() })
      qc.invalidateQueries({ queryKey: queryKeys.loyalty.byUser(clientId) })
      qc.invalidateQueries({ queryKey: ['loyalty', 'appt-status'] })
    },
  })
}

/** Undoes a revocation — restores awarded points. */
export function useAdminUndoRevoke() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ appointmentId, clientId }: { appointmentId: string; clientId: string }) =>
      repositories.loyalty().undoRevokePoints(appointmentId, clientId),
    onSuccess: (_d, { clientId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.loyalty.all() })
      qc.invalidateQueries({ queryKey: queryKeys.loyalty.byUser(clientId) })
      qc.invalidateQueries({ queryKey: ['loyalty', 'appt-status'] })
    },
  })
}

/** Undoes an award — removes points as if never granted. */
export function useAdminUndoAward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ appointmentId, clientId }: { appointmentId: string; clientId: string }) =>
      repositories.loyalty().undoAwardPoints(appointmentId, clientId),
    onSuccess: (_d, { clientId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.loyalty.all() })
      qc.invalidateQueries({ queryKey: queryKeys.loyalty.byUser(clientId) })
      qc.invalidateQueries({ queryKey: ['loyalty', 'appt-status'] })
    },
  })
}

/** Admin manual points adjustment (add or subtract). */
export function useManualAdjustPoints() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ clientId, points, description }: { clientId: string; points: number; description: string }) =>
      repositories.loyalty().manualAdjustPoints(clientId, points, description),
    onSuccess: (_d, { clientId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.loyalty.all() })
      qc.invalidateQueries({ queryKey: queryKeys.loyalty.byUser(clientId) })
    },
  })
}

/** Recent loyalty transactions for a client (used in admin panels). */
export function useRecentTransactions(clientId: string | undefined, limit = 8) {
  return useQuery({
    queryKey: ['loyalty', 'transactions', clientId ?? '', limit],
    queryFn: () => repositories.loyalty().getRecentTransactions(clientId!, limit),
    enabled: !!clientId,
    staleTime: STALE.LOYALTY,
  })
}
