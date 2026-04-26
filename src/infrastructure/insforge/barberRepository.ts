import type { IBarberRepository, Barber } from '@/domain/barber'
import { insforgeClient } from './client'

interface BarberRow {
  id: string
  full_name: string
  bio: string | null
  avatar_url: string | null
  specialty_ids: string[] | null
  is_active: boolean
}

function mapToBarber(row: BarberRow): Barber {
  return {
    id: row.id,
    fullName: row.full_name,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    specialtyIds: Array.isArray(row.specialty_ids) ? row.specialty_ids : [],
    isActive: row.is_active,
  }
}

export class InsForgeBarberRepository implements IBarberRepository {
  async getActive(): Promise<Barber[]> {
    const { data, error } = await insforgeClient.database
      .from('barbers')
      .select('id, full_name, bio, avatar_url, specialty_ids, is_active')
      .eq('is_active', true)
    if (error) throw error
    return ((data ?? []) as BarberRow[]).map(mapToBarber)
  }

  async getAll(): Promise<Barber[]> {
    const { data, error } = await insforgeClient.database
      .from('barbers')
      .select('id, full_name, bio, avatar_url, specialty_ids, is_active')
    if (error) throw error
    return ((data ?? []) as BarberRow[]).map(mapToBarber)
  }
}
