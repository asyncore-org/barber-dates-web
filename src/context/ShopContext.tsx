import { createContext, useContext, useState } from 'react'
import { MOCK_SHOP } from '@/lib/mock-data'

interface ShopInfo {
  name: string
  phone: string
  email: string
  instagram: string
  address: string
  description: string
  maxAdvanceDays: number
}

interface ShopContextValue extends ShopInfo {
  updateShop: (partial: Partial<ShopInfo>) => void
}

const ShopContext = createContext<ShopContextValue | null>(null)

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [shop, setShop] = useState<ShopInfo>({
    name: MOCK_SHOP.name,
    phone: MOCK_SHOP.phone,
    email: MOCK_SHOP.email,
    instagram: MOCK_SHOP.instagram,
    address: MOCK_SHOP.address,
    description: MOCK_SHOP.description,
    maxAdvanceDays: 14,
  })

  const updateShop = (partial: Partial<ShopInfo>) =>
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
