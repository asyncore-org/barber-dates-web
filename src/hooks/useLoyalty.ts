import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { repositories } from '@/infrastructure'
import type { CreateRewardData, UpdateRewardData } from '@/domain/loyalty'
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
