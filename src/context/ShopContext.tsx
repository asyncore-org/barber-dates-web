import { createContext, useContext, useState } from 'react'
import { MOCK_SHOP } from '@/lib/mock-data'

interface ShopState {
  name: string
  maxAdvanceDays: number
}

interface ShopContextValue extends ShopState {
  updateShop: (partial: Partial<ShopState>) => void
}

const ShopContext = createContext<ShopContextValue | null>(null)

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [shop, setShop] = useState<ShopState>({
    name: MOCK_SHOP.name,
    maxAdvanceDays: 14,
  })

  const updateShop = (partial: Partial<ShopState>) =>
    setShop(s => ({ ...s, ...partial }))

  return (
    <ShopContext.Provider value={{ ...shop, updateShop }}>
      {children}
    </ShopContext.Provider>
  )
}

export function useShopContext() {
  const ctx = useContext(ShopContext)
  if (!ctx) throw new Error('useShopContext must be used within ShopProvider')
  return ctx
}
