import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { repositories } from '@/infrastructure'
import type { ShopInfo, BookingConfig, LoyaltyConfig } from '@/domain/shop'
import { DEFAULT_BOOKING_CONFIG } from '@/domain/shop'
import { queryKeys, STALE } from './queryKeys'

const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  pointsPerEuro: 1,
  stampGoal: 10,
  enabled: true,
  rewardMode: 'one_time',
}

export function useShopInfo() {
  return useQuery({
    queryKey: queryKeys.shop.info(),
    queryFn: () => repositories.shop().getShopInfo(),
    staleTime: STALE.LONG,
  })
}

export function useBookingConfig() {
  return useQuery({
    queryKey: queryKeys.shop.booking(),
    queryFn: async () => {
      const config = await repositories.shop().getBookingConfig()
      return config ?? DEFAULT_BOOKING_CONFIG
    },
    staleTime: STALE.LONG,
  })
}

export function useLoyaltyConfig() {
  return useQuery({
    queryKey: queryKeys.shop.loyalty(),
    queryFn: async () => {
      const config = await repositories.shop().getLoyaltyConfig()
      return config ? { ...DEFAULT_LOYALTY_CONFIG, ...config } : DEFAULT_LOYALTY_CONFIG
    },
    staleTime: STALE.LONG,
  })
}

export function useMutateShopInfo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (info: Partial<ShopInfo>) => repositories.shop().updateShopInfo(info),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.shop.info() }),
  })
}

export function useMutateBookingConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (config: Partial<BookingConfig>) =>
      repositories.shop().updateBookingConfig(config),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.shop.booking() }),
  })
}
