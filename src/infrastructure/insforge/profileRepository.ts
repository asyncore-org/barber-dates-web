import type { Profile, UpdateProfileData, UserRole } from '@/domain/user'
import { insforgeClient } from './client'

interface ProfileRow {
  id: string
  email: string
}

interface AdminProfileRow {
  id: string
  email: string
  full_name: string | null
  role: UserRole
}

export interface AdminProfile {
  id: string
  email: string
  fullName: string | null
  role: UserRole
}

export class InsForgeProfileRepository {
  async findByEmail(email: string): Promise<Profile | null> {
    const { data, error } = await insforgeClient.database
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()
    if (error) throw error
    return data as ProfileRow | null
  }

  async update(id: string, data: UpdateProfileData): Promise<void> {
    const patch: Record<string, unknown> = {}
    if (data.fullName !== undefined) patch.full_name = data.fullName
    if (data.phone !== undefined) patch.phone = data.phone
    const { error } = await insforgeClient.database
      .from('profiles')
      .update(patch)
      .eq('id', id)
    if (error) throw error
  }

  async getAll(): Promise<AdminProfile[]> {
    const { data, error } = await insforgeClient.database
      .from('profiles')
      .select('id, email, full_name, role')
      .order('role')
      .order('email')
    if (error) throw error
    return ((data ?? []) as AdminProfileRow[]).map(r => ({
      id: r.id,
      email: r.email,
      fullName: r.full_name,
      role: r.role,
    }))
  }

  async updateRole(id: string, role: UserRole): Promise<void> {
    const { error } = await insforgeClient.database
      .from('profiles')
      .update({ role })
      .eq('id', id)
    if (error) throw error
  }
}
