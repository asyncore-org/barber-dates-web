import type { IShopRepository, ShopInfo, BookingConfig, LoyaltyConfig } from '@/domain/shop'
import { insforgeClient } from './client'

interface ShopConfigRow {
  value: unknown
}

async function getConfigValue<T>(key: string): Promise<T | null> {
  const { data, error } = await insforgeClient.database
    .from('shop_config')
    .select('value')
    .eq('key', key)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return (data as ShopConfigRow).value as T
}

async function upsertConfigValue(key: string, value: unknown): Promise<void> {
  const { error } = await insforgeClient.database
    .from('shop_config')
    .upsert({ key, value }, { onConflict: 'key' })
  if (error) throw error
}

export class InsForgeShopRepository implements IShopRepository {
  getShopInfo(): Promise<ShopInfo | null> {
    return getConfigValue<ShopInfo>('shop_info')
  }

  getBookingConfig(): Promise<BookingConfig | null> {
    return getConfigValue<BookingConfig>('booking')
  }

  getLoyaltyConfig(): Promise<LoyaltyConfig | null> {
    return getConfigValue<LoyaltyConfig>('loyalty')
  }

  async updateShopInfo(info: Partial<ShopInfo>): Promise<void> {
    const current = await this.getShopInfo()
    await upsertConfigValue('shop_info', { ...current, ...info })
  }

  async updateBookingConfig(config: Partial<BookingConfig>): Promise<void> {
    const current = await this.getBookingConfig()
    await upsertConfigValue('booking', { ...current, ...config })
  }
}
