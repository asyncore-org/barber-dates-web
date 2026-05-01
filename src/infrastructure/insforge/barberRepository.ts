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
  is_active: boolean
  break_start: string | null
  break_end: string | null
}

// specialty_ids (JSONB) excluded — InsForge rejects JSONB columns in GET ?select param.
// Specialty filtering is not implemented in the UI; always defaults to [].
const SELECT = 'id, full_name, role, bio, avatar_url, phone, email, is_active, break_start, break_end'

function mapToBarber(row: BarberRow): Barber {
  return {
    id: row.id,
    fullName: row.full_name,
    role: row.role,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    phone: row.phone,
    email: row.email,
    specialtyIds: [],
    isActive: row.is_active,
    breakStart: row.break_start,
    breakEnd: row.break_end,
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

  async findByEmail(email: string): Promise<Barber | null> {
    const { data, error } = await insforgeClient.database
      .from('barbers')
      .select(SELECT)
      .eq('email', email)
      .limit(1)
    if (error) throw error
    const rows = (data ?? []) as BarberRow[]
    return rows.length > 0 ? mapToBarber(rows[0]) : null
  }

  async create(data: CreateBarberData): Promise<Barber> {
    // InsForge does not support ?select on POST — insert without returning clause.
    // The caller (useAddBarberByEmail) ignores the return value and invalidates
    // the query cache on success, so a synthetic object is sufficient here.
    const body: Record<string, unknown> = { full_name: data.fullName, is_active: true }
    if (data.role != null) body.role = data.role
    if (data.bio != null) body.bio = data.bio
    if (data.phone != null) body.phone = data.phone
    if (data.email != null) body.email = data.email
    const { error } = await insforgeClient.database.from('barbers').insert(body)
    if (error) throw error
    return {
      id: '',
      fullName: data.fullName,
      role: data.role ?? null,
      bio: data.bio ?? null,
      avatarUrl: null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      specialtyIds: [],
      isActive: true,
      breakStart: null,
      breakEnd: null,
    }
  }

  async update(id: string, data: UpdateBarberData): Promise<Barber> {
    const patch: Record<string, unknown> = {}
    if (data.fullName !== undefined) patch.full_name = data.fullName
    if (data.role !== undefined) patch.role = data.role
    if (data.bio !== undefined) patch.bio = data.bio
    if (data.phone !== undefined) patch.phone = data.phone
    if (data.email !== undefined) patch.email = data.email
    if (data.isActive !== undefined) patch.is_active = data.isActive
    if (data.breakStart !== undefined) patch.break_start = data.breakStart
    if (data.breakEnd !== undefined) patch.break_end = data.breakEnd

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
