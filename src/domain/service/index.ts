export interface Service {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  price: number
  loyaltyPoints: number
  isActive: boolean
  isDeleted: boolean
  sortOrder: number
}

export interface CreateServiceData {
  name: string
  durationMinutes: number
  price: number
  loyaltyPoints: number
  description?: string
  sortOrder?: number
}

export interface UpdateServiceData {
  name?: string
  durationMinutes?: number
  price?: number
  loyaltyPoints?: number
  description?: string
  isActive?: boolean
  sortOrder?: number
}

export interface IServiceRepository {
  getActive(): Promise<Service[]>
  getAll(): Promise<Service[]>
  create(data: CreateServiceData): Promise<Service>
  update(id: string, data: UpdateServiceData): Promise<Service>
  delete(id: string): Promise<void>
  reactivate(id: string): Promise<void>
  softDelete(id: string): Promise<void>
}
