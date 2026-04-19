import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { User, UserRole } from '@/domain/user'
import { insforgeClient } from '@/infrastructure/insforge'

function mapToUser(supabaseUser: SupabaseUser): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    fullName:
      (supabaseUser.user_metadata?.full_name as string | undefined) ??
      (supabaseUser.email ?? '').split('@')[0],
    // app_metadata.role is set by the server (admin dashboard); user_metadata.role
    // is what the client writes on signup. app_metadata takes precedence.
    role: ((supabaseUser.app_metadata?.role as string | undefined) ??
      (supabaseUser.user_metadata?.role as string | undefined) ??
      'client') as UserRole,
    phone: (supabaseUser.user_metadata?.phone as string | undefined) ?? undefined,
    avatarUrl: (supabaseUser.user_metadata?.avatar_url as string | undefined) ?? undefined,
  }
}

export const authRepository = {
  async signIn(email: string, password: string): Promise<User> {
    const { data, error } = await insforgeClient.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    return mapToUser(data.user)
  },

  async signUp(email: string, password: string, fullName: string): Promise<User> {
    const { data, error } = await insforgeClient.auth.signUp({
      email,
      password,
      options: {
        // role is always 'client' on self-registration — admins are created via InsForge dashboard
        data: { full_name: fullName, role: 'client' },
      },
    })
    if (error) throw new Error(error.message)
    if (!data.user) throw new Error('Revisa tu email para confirmar tu cuenta.')
    return mapToUser(data.user)
  },

  async signOut(): Promise<void> {
    const { error } = await insforgeClient.auth.signOut()
    if (error) throw new Error(error.message)
  },

  async getSession(): Promise<User | null> {
    const { data, error } = await insforgeClient.auth.getSession()
    if (error || !data.session) return null
    return mapToUser(data.session.user)
  },
}
