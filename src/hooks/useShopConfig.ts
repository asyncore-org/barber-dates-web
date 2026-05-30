import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { repositories } from '@/infrastructure'
import type { ShopInfo, BookingConfig, LoyaltyConfig, LoyaltyTierConfig } from '@/domain/shop'
import { DEFAULT_BOOKING_CONFIG } from '@/domain/shop'
import { queryKeys, STALE } from './queryKeys'

export const DEFAULT_LOYALTY_TIERS: LoyaltyTierConfig[] = [
  { id: 'cobre',    name: 'COBRE',    color: '#a85228', minPoints: 0,    rewards: [] },
  { id: 'bronce',   name: 'BRONCE',   color: '#886015', minPoints: 50,   rewards: [] },
  { id: 'plata',    name: 'PLATA',    color: '#607890', minPoints: 150,  rewards: [] },
  { id: 'oro',      name: 'ORO',      color: '#a87e12', minPoints: 300,  rewards: [] },
  { id: 'platino',  name: 'PLATINO',  color: '#505098', minPoints: 500,  rewards: [] },
  { id: 'diamante', name: 'DIAMANTE', color: '#1480a0', minPoints: 800,  rewards: [] },
  { id: 'zafiro',   name: 'ZAFIRO',   color: '#1830a8', minPoints: 1200, rewards: [] },
  { id: 'leyenda',  name: 'LEYENDA',  color: '#b88c28', minPoints: 2000, rewards: [] },
]

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  pointsPerEuro: 1,
  stampGoal: 10,
  enabled: true,
  rewardMode: 'one_time',
  mode: 'tiers',
  tiers: DEFAULT_LOYALTY_TIERS,
  maxPoints: 500,
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
