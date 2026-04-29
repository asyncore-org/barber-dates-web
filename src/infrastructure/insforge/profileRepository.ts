import type { Profile, UpdateProfileData } from '@/domain/user'
import { insforgeClient } from './client'

interface ProfileRow {
  id: string
  email: string
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
}
