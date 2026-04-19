import type { User, UserRole } from '@/domain/user'
import { insforgeClient } from '@/infrastructure/insforge'

const IS_MOCK_MODE = import.meta.env.VITE_USE_MOCKS === 'true'

export const isGoogleConfigured = import.meta.env.VITE_GOOGLE_OAUTH_ENABLED === 'true'

// Shape of the user object returned by the InsForge SDK
interface InsForgeUser {
  id: string
  email: string
  emailVerified: boolean
  providers: string[]
  createdAt: string
  updatedAt: string
  profile: { name?: string; avatar_url?: string } | null
  metadata: Record<string, unknown> | null
}

function normalizeAuthError(
  error: unknown,
  operation: 'login' | 'signup' | 'google' | 'signout' | 'reset' | 'update',
): Error {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase()
  // InsForge errors may carry a code in the `error` property
  const code = (error as { error?: string })?.error?.toLowerCase() ?? ''

  if (import.meta.env.DEV) {
    console.error(`[auth:${operation}]`, error)
  }

  if (operation === 'login') {
    if (
      code.includes('invalid') ||
      message.includes('invalid') ||
      message.includes('credentials') ||
      message.includes('password') ||
      message.includes('not found')
    ) {
      return new Error('Email o contraseña incorrectos.')
    }
    if (code.includes('email') || message.includes('email') && message.includes('verif')) {
      return new Error('Debes confirmar tu email antes de iniciar sesión.')
    }
    return new Error('No hemos podido iniciar sesión. Inténtalo de nuevo en unos minutos.')
  }

  if (operation === 'signup') {
    if (
      code.includes('exists') ||
      code.includes('duplicate') ||
      message.includes('already') ||
      message.includes('exists')
    ) {
      return new Error('Ya existe una cuenta con ese email.')
    }
    return new Error('No hemos podido crear tu cuenta. Inténtalo de nuevo en unos minutos.')
  }

  if (operation === 'google') {
    return new Error('No hemos podido conectar con Google. Inténtalo de nuevo en unos minutos.')
  }

  if (operation === 'reset') {
    return new Error(
      'No hemos podido enviar el email de recuperación. Inténtalo de nuevo en unos minutos.',
    )
  }

  if (operation === 'update') {
    return new Error(
      'No hemos podido actualizar tu contraseña. Inténtalo de nuevo en unos minutos.',
    )
  }

  return new Error('No hemos podido cerrar sesión. Inténtalo de nuevo.')
}

function mapToUser(user: InsForgeUser): User {
  return {
    id: user.id,
    email: user.email,
    fullName: user.profile?.name ?? user.email.split('@')[0],
    role: ((user.metadata?.role as string | undefined) ?? 'client') as UserRole,
    avatarUrl: user.profile?.avatar_url ?? undefined,
  }
}

export const authRepository = {
  async signIn(email: string, password: string): Promise<User> {
    try {
      const { data, error } = await insforgeClient.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (!data?.user) throw new Error('No se recibió usuario del servidor.')
      return mapToUser(data.user as InsForgeUser)
    } catch (error) {
      throw normalizeAuthError(error, 'login')
    }
  },

  async signUp(email: string, password: string, fullName: string): Promise<User> {
    try {
      const { data, error } = await insforgeClient.auth.signUp({
        email,
        password,
        name: fullName,
      })
      if (error) throw error
      if (!data?.user) throw new Error('No se pudo crear la cuenta.')
      if (data.requireEmailVerification) throw new Error('Revisa tu email para confirmar tu cuenta.')
      return mapToUser(data.user as InsForgeUser)
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

  // Triggers browser redirect to Google — returns null (page navigates away).
  async signInWithGoogle(): Promise<User | null> {
    if (IS_MOCK_MODE) {
      const { data, error } = await insforgeClient.auth.signInWithPassword({
        email: 'client@gio.test',
        password: 'password123',
      })
      if (error) throw error
      if (!data?.user) throw new Error('No se pudo iniciar sesión con Google (mock).')
      return mapToUser(data.user as InsForgeUser)
    }

    try {
      const redirectTo = `${window.location.origin}/auth`
      const { error } = await insforgeClient.auth.signInWithOAuth({
        provider: 'google',
        redirectTo,
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
      const { error } = await insforgeClient.auth.sendResetPasswordEmail({ email, redirectTo })
      if (error) throw error
    } catch (error) {
      throw normalizeAuthError(error, 'reset')
    }
  },

  // otp: token extracted from the reset email redirect URL (?token=xxx)
  async updatePassword(password: string, otp: string): Promise<void> {
    try {
      const { error } = await insforgeClient.auth.resetPassword({ newPassword: password, otp })
      if (error) throw error
    } catch (error) {
      throw normalizeAuthError(error, 'update')
    }
  },

  // getCurrentUser handles OAuth callbacks automatically (insforge_code in URL)
  async getSession(): Promise<User | null> {
    const { data, error } = await insforgeClient.auth.getCurrentUser()
    if (error || !data?.user) return null
    return mapToUser(data.user as InsForgeUser)
  },
}
