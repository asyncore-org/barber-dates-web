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
}

export const DEFAULT_BOOKING_CONFIG: BookingConfig = {
  maxAdvanceDays: 14,
  allowBarberChoice: true,
  slotIntervalMinutes: 15,
  bufferMinutes: 0,
}

export interface IShopRepository {
  getShopInfo(): Promise<ShopInfo | null>
  getBookingConfig(): Promise<BookingConfig | null>
  getLoyaltyConfig(): Promise<LoyaltyConfig | null>
  updateShopInfo(info: Partial<ShopInfo>): Promise<void>
  updateBookingConfig(config: Partial<BookingConfig>): Promise<void>
}
