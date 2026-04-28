import type { Profile } from '@/domain/user'
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
}
