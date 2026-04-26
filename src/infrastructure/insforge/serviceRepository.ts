import type { IServiceRepository, Service } from '@/domain/service'
import { insforgeClient } from './client'

interface ServiceRow {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number | string
  loyalty_points: number
  is_active: boolean
  sort_order: number
}

function mapToService(row: ServiceRow): Service {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    durationMinutes: row.duration_minutes,
    price: Number(row.price),
    loyaltyPoints: row.loyalty_points,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  }
}

export class InsForgeServiceRepository implements IServiceRepository {
  async getActive(): Promise<Service[]> {
    const { data, error } = await insforgeClient.database
      .from('services')
      .select('id, name, description, duration_minutes, price, loyalty_points, is_active, sort_order')
      .eq('is_active', true)
      .order('sort_order')
    if (error) throw error
    return ((data ?? []) as ServiceRow[]).map(mapToService)
  }

  async getAll(): Promise<Service[]> {
    const { data, error } = await insforgeClient.database
      .from('services')
      .select('id, name, description, duration_minutes, price, loyalty_points, is_active, sort_order')
      .order('sort_order')
    if (error) throw error
    return ((data ?? []) as ServiceRow[]).map(mapToService)
  }
}
