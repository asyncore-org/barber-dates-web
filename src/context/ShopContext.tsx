import { createContext, useContext } from 'react'
import { useShopInfo, useBookingConfig } from '@/hooks/useShopConfig'
import { useApplyColorTheme } from '@/hooks/useColorTheme'
import type { ShopInfo } from '@/domain/shop'
import { DEFAULT_BOOKING_CONFIG } from '@/domain/shop'

const DEFAULT_SHOP_INFO: ShopInfo = {
  name: 'Gio Barber Shop',
  phone: '',
  email: '',
  instagram: '',
  address: '',
  description: '',
}

interface ShopContextValue {
  name: string
  phone: string
  email: string
  instagram: string
  address: string
  description: string
  maxAdvanceDays: number
  allowBarberChoice: boolean
  slotIntervalMinutes: number
  bufferMinutes: number
  isLoading: boolean
  /** @deprecated Will be removed in Paso 8 — use useMutateShopInfo / useMutateBookingConfig directly */
  updateShop: (partial: Partial<Omit<ShopContextValue, 'isLoading' | 'updateShop'>>) => void
}

const ShopContext = createContext<ShopContextValue | null>(null)

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const { data: shopInfo, isLoading: loadingInfo } = useShopInfo()
  const { data: bookingConfig, isLoading: loadingBooking } = useBookingConfig()
  useApplyColorTheme()

  const info = shopInfo ?? DEFAULT_SHOP_INFO
  const booking = bookingConfig ?? DEFAULT_BOOKING_CONFIG

  const value: ShopContextValue = {
    name: info.name,
    phone: info.phone,
    email: info.email,
    instagram: info.instagram,
    address: info.address,
    description: info.description,
    maxAdvanceDays: booking.maxAdvanceDays,
    allowBarberChoice: booking.allowBarberChoice,
    slotIntervalMinutes: booking.slotIntervalMinutes,
    bufferMinutes: booking.bufferMinutes,
    isLoading: loadingInfo || loadingBooking,
    // Stub until SettingsPage is rewired in Paso 8
    updateShop: () => undefined,
  }

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}

export function useShopContext() {
  const ctx = useContext(ShopContext)
  if (!ctx) throw new Error('useShopContext must be used within ShopProvider')
  return ctx
}
