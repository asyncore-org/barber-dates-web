import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { User, UserRole } from '@/domain/user'
import { insforgeClient } from '@/infrastructure/insforge'

const IS_MOCK_MODE = import.meta.env.VITE_USE_MOCKS === 'true'

export const isGoogleConfigured = import.meta.env.VITE_GOOGLE_OAUTH_ENABLED === 'true'

function normalizeAuthError(error: unknown, operation: 'login' | 'signup' | 'google' | 'signout' | 'reset' | 'update'): Error {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase()

  if (import.meta.env.DEV) {
    console.error(`[auth:${operation}]`, error)
  }

  if (operation === 'login') {
    if (
      message.includes('invalid login credentials') ||
      message.includes('invalid credentials') ||
      message.includes('email or password')
    ) {
      return new Error('Email o contraseña incorrectos.')
    }
    if (message.includes('email not confirmed')) {
      return new Error('Debes confirmar tu email antes de iniciar sesión.')
    }
    return new Error('No hemos podido iniciar sesión. Inténtalo de nuevo en unos minutos.')
  }

  if (operation === 'signup') {
    if (message.includes('already registered') || message.includes('already exists')) {
      return new Error('Ya existe una cuenta con ese email.')
    }
    return new Error('No hemos podido crear tu cuenta. Inténtalo de nuevo en unos minutos.')
  }

  if (operation === 'google') {
    return new Error('No hemos podido conectar con Google. Inténtalo de nuevo en unos minutos.')
  }

  if (operation === 'reset') {
    return new Error('No hemos podido enviar el email de recuperación. Inténtalo de nuevo en unos minutos.')
  }

  if (operation === 'update') {
    return new Error('No hemos podido actualizar tu contraseña. Inténtalo de nuevo en unos minutos.')
  }

  return new Error('No hemos podido cerrar sesión. Inténtalo de nuevo.')
}

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
    try {
      const { data, error } = await insforgeClient.auth.signInWithPassword({ email, password })
      if (error) throw error
      return mapToUser(data.user)
    } catch (error) {
      throw normalizeAuthError(error, 'login')
    }
  },

  async signUp(email: string, password: string, fullName: string): Promise<User> {
    try {
      const { data, error } = await insforgeClient.auth.signUp({
        email,
        password,
        options: {
          // role is always 'client' on self-registration — admins are created via InsForge dashboard
          data: { full_name: fullName, role: 'client' },
        },
      })
      if (error) throw error
      if (!data.user) throw new Error('No se pudo crear la cuenta.')
      if (!data.session) throw new Error('Revisa tu email para confirmar tu cuenta.')
      return mapToUser(data.user)
    } catch (error) {
      throw normalizeAuthError(error, 'signup')
    }
  },

  async signOut(): Promise<void> {
    try {
      const { error } = await insforgeClient.auth.signOut()
      if (error) throw error
    } catch (error) {
      throw normalizeAuthError(error, 'signout')
    }
  },

  // Triggers a browser redirect to Google — returns null (page navigates away).
  // Throws if Google OAuth is not enabled in the InsForge project.
  async signInWithGoogle(): Promise<User | null> {
    if (IS_MOCK_MODE) {
      const { data, error } = await insforgeClient.auth.signInWithPassword({
        email: 'client@gio.test',
        password: 'password123',
      })
      if (error) throw error
      if (!data.user) throw new Error('No se pudo iniciar sesión con Google (mock).')
      return mapToUser(data.user)
    }

    try {
      const redirectTo = `${window.location.origin}/auth`
      const { error } = await insforgeClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
      if (error) throw error
      return null
    } catch (error) {
      throw normalizeAuthError(error, 'google')
    }
  },

  async resetPasswordForEmail(email: string): Promise<void> {
    try {
      const redirectTo = `${window.location.origin}/auth`
      const { error } = await insforgeClient.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) throw error
    } catch (error) {
      throw normalizeAuthError(error, 'reset')
    }
  },

  async updatePassword(password: string): Promise<void> {
    try {
      const { error } = await insforgeClient.auth.updateUser({ password })
      if (error) throw error
    } catch (error) {
      throw normalizeAuthError(error, 'update')
    }
  },

  async getSession(): Promise<User | null> {
    const { data, error } = await insforgeClient.auth.getSession()
    if (error || !data.session) return null
    return mapToUser(data.session.user)
  },
}
