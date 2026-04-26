export interface Service {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  price: number
  loyaltyPoints: number
  isActive: boolean
  sortOrder: number
}

export interface IServiceRepository {
  getActive(): Promise<Service[]>
  getAll(): Promise<Service[]>
}
