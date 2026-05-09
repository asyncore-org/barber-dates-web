export interface ShopInfo {
  name: string
  phone: string
  email: string
  instagram: string
  address: string
  description: string
}

export interface BookingConfig {
  maxAdvanceDays: number
  allowBarberChoice: boolean
  slotIntervalMinutes: number
  bufferMinutes: number
}

export interface LoyaltyConfig {
  pointsPerEuro: number
  stampGoal: number
  enabled: boolean
  /** Whether a reward can be redeemed once per client or repeatedly when points allow. */
  rewardMode: 'one_time' | 'repeatable'
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
}
