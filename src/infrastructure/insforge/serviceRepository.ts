import type { IServiceRepository, Service, CreateServiceData, UpdateServiceData } from '@/domain/service'
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

const SELECT = 'id, name, description, duration_minutes, price, loyalty_points, is_active, sort_order'

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
      .select(SELECT)
      .eq('is_active', true)
      .order('sort_order')
    if (error) throw error
    return ((data ?? []) as ServiceRow[]).map(mapToService)
  }

  async getAll(): Promise<Service[]> {
    const { data, error } = await insforgeClient.database
      .from('services')
      .select(SELECT)
      .order('sort_order')
    if (error) throw error
    return ((data ?? []) as ServiceRow[]).map(mapToService)
  }

  async create(data: CreateServiceData): Promise<Service> {
    const { data: row, error } = await insforgeClient.database
      .from('services')
      .insert({
        name: data.name,
        duration_minutes: data.durationMinutes,
        price: data.price,
        loyalty_points: data.loyaltyPoints,
        description: data.description ?? null,
        sort_order: data.sortOrder ?? 99,
        is_active: true,
      })
      .select(SELECT)
      .single()
    if (error) throw error
    return mapToService(row as ServiceRow)
  }

  async update(id: string, data: UpdateServiceData): Promise<Service> {
    const patch: Record<string, unknown> = {}
    if (data.name !== undefined) patch.name = data.name
    if (data.durationMinutes !== undefined) patch.duration_minutes = data.durationMinutes
    if (data.price !== undefined) patch.price = data.price
    if (data.loyaltyPoints !== undefined) patch.loyalty_points = data.loyaltyPoints
    if (data.description !== undefined) patch.description = data.description
    if (data.isActive !== undefined) patch.is_active = data.isActive
    if (data.sortOrder !== undefined) patch.sort_order = data.sortOrder

    const { data: row, error } = await insforgeClient.database
      .from('services')
      .update(patch)
      .eq('id', id)
      .select(SELECT)
      .single()
    if (error) throw error
    return mapToService(row as ServiceRow)
  }

  async delete(id: string): Promise<void> {
    const { error } = await insforgeClient.database
      .from('services')
      .delete()
      .eq('id', id)
    if (error) throw error
  }
}
