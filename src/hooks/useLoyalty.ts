import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { repositories } from '@/infrastructure'
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
    mutationFn: ({ clientId, rewardId }: { clientId: string; rewardId: string }) =>
      repositories.loyalty().redeemReward(clientId, rewardId),
    onSuccess: (_data, { clientId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.loyalty.redeemed(clientId) })
      qc.invalidateQueries({ queryKey: queryKeys.loyalty.byUser(clientId) })
    },
  })
}
