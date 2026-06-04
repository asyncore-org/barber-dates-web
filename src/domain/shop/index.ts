export type LogoShape =
  | 'hexagon' | 'circle' | 'square' | 'rounded' | 'squircle'
  | 'pentagon' | 'rectangle' | 'oval' | 'diamond' | 'shield' | 'triangle' | 'badge'

export interface ShopInfo {
  name: string
  phone: string
  email: string
  instagram: string
  address: string
  description: string
  opening_hours?: string
  logo_url?: string
  logo_shape?: LogoShape
  logo_scale?: number
  logo_offset_x?: number
  logo_offset_y?: number
}

export interface BookingConfig {
  maxAdvanceDays: number
  allowBarberChoice: boolean
  slotIntervalMinutes: number
  bufferMinutes: number
}

export interface LoyaltyTierReward {
  id: string
  label: string
  cost: number
  /** true = permanente (siempre disponible en el nivel); false = un solo uso (se consume al canjear) */
  isPermanent?: boolean
}

export interface LoyaltyTierConfig {
  id: string
  name: string
  color: string
  minPoints: number
  rewards: LoyaltyTierReward[]
}

export interface LoyaltyConfig {
  pointsPerEuro: number
  stampGoal: number
  enabled: boolean
  rewardMode: 'one_time' | 'repeatable'
  /** Active card modality. */
  mode: 'tiers' | 'simple'
  /** Tier definitions for mode === 'tiers'. Stored as JSON in app_config. */
  tiers: LoyaltyTierConfig[]
  /** Max points cap for mode === 'simple'. */
  maxPoints: number
}

export const DEFAULT_BOOKING_CONFIG: BookingConfig = {
  maxAdvanceDays: 14,
  allowBarberChoice: true,
  slotIntervalMinutes: 15,
  bufferMinutes: 0,
}

import type { ColorThemeConfig } from '@/domain/colorTheme'

export interface IShopRepository {
  getShopInfo(): Promise<ShopInfo | null>
  getBookingConfig(): Promise<BookingConfig | null>
  getLoyaltyConfig(): Promise<LoyaltyConfig | null>
  getColorTheme(): Promise<ColorThemeConfig | null>
  updateShopInfo(info: Partial<ShopInfo>): Promise<void>
  updateBookingConfig(config: Partial<BookingConfig>): Promise<void>
  updateLoyaltyConfig(config: Partial<LoyaltyConfig>): Promise<void>
  updateColorTheme(config: ColorThemeConfig): Promise<void>
  uploadLogo(file: File): Promise<string>
}
