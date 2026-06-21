import type { IShopRepository, ShopInfo, BookingConfig, LoyaltyConfig } from '@/domain/shop'
import type { ColorThemeConfig } from '@/domain/colorTheme'
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

  async updateLoyaltyConfig(config: Partial<LoyaltyConfig>): Promise<void> {
    const current = await this.getLoyaltyConfig()
    await upsertConfigValue('loyalty', { ...current, ...config })
  }

  getColorTheme(): Promise<ColorThemeConfig | null> {
    return getConfigValue<ColorThemeConfig>('color_theme')
  }

  async updateColorTheme(config: ColorThemeConfig): Promise<void> {
    await upsertConfigValue('color_theme', config)
  }

  async uploadLogo(file: File): Promise<string> {
    const MAX_BYTES = 2 * 1024 * 1024
    if (file.size > MAX_BYTES) throw new Error('El logo no puede superar 2 MB')

    const ext = file.name.split('.').pop() ?? 'png'
    const path = `logo-${Date.now()}.${ext}`
    const bucket = insforgeClient.storage.from('shop-logos')

    const { data, error } = await bucket.upload(path, file)
    if (error || !data) throw error ?? new Error('Upload failed')

    const url = bucket.getPublicUrl(data.key)
    await this.updateShopInfo({ logo_url: url })
    return url
  }
}
