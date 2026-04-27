import type { IBarberRepository, Barber, CreateBarberData, UpdateBarberData } from '@/domain/barber'
import { insforgeClient } from './client'

interface BarberRow {
  id: string
  full_name: string
  role: string | null
  bio: string | null
  avatar_url: string | null
  phone: string | null
  email: string | null
  specialty_ids: string[] | null
  is_active: boolean
}

const SELECT = 'id, full_name, role, bio, avatar_url, phone, email, specialty_ids, is_active'

function mapToBarber(row: BarberRow): Barber {
  return {
    id: row.id,
    fullName: row.full_name,
    role: row.role,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    phone: row.phone,
    email: row.email,
    specialtyIds: Array.isArray(row.specialty_ids) ? row.specialty_ids : [],
    isActive: row.is_active,
  }
}

export class InsForgeBarberRepository implements IBarberRepository {
  async getActive(): Promise<Barber[]> {
    const { data, error } = await insforgeClient.database
      .from('barbers')
      .select(SELECT)
      .eq('is_active', true)
    if (error) throw error
    return ((data ?? []) as BarberRow[]).map(mapToBarber)
  }

  async getAll(): Promise<Barber[]> {
    const { data, error } = await insforgeClient.database
      .from('barbers')
      .select(SELECT)
    if (error) throw error
    return ((data ?? []) as BarberRow[]).map(mapToBarber)
  }

  async create(data: CreateBarberData): Promise<Barber> {
    const { data: row, error } = await insforgeClient.database
      .from('barbers')
      .insert({
        full_name: data.fullName,
        role: data.role ?? null,
        bio: data.bio ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
      })
      .select(SELECT)
      .single()
    if (error) throw error
    return mapToBarber(row as BarberRow)
  }

  async update(id: string, data: UpdateBarberData): Promise<Barber> {
    const patch: Record<string, unknown> = {}
    if (data.fullName !== undefined) patch.full_name = data.fullName
    if (data.role !== undefined) patch.role = data.role
    if (data.bio !== undefined) patch.bio = data.bio
    if (data.phone !== undefined) patch.phone = data.phone
    if (data.email !== undefined) patch.email = data.email
    if (data.isActive !== undefined) patch.is_active = data.isActive

    const { data: row, error } = await insforgeClient.database
      .from('barbers')
      .update(patch)
      .eq('id', id)
      .select(SELECT)
      .single()
    if (error) throw error
    return mapToBarber(row as BarberRow)
  }

  async delete(id: string): Promise<void> {
    const { error } = await insforgeClient.database
      .from('barbers')
      .update({ is_active: false })
      .eq('id', id)
    if (error) throw error
  }
}
