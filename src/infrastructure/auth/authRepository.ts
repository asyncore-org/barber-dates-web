import type { User, UserRole } from '@/domain/user'
import {
  insforgeClient,
  OAUTH_CALLBACK_CODE_KEY,
  OAUTH_CALLBACK_ERROR_KEY,
  OAUTH_CALLBACK_SEEN_KEY,
} from '@/infrastructure/insforge'

async function fetchProfileRole(userId: string): Promise<UserRole | null> {
  try {
    const { data } = await insforgeClient.database
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()
    return (data as { role: UserRole } | null)?.role ?? null
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[auth] fetchProfileRole fallback to metadata role:', err)
    return null
  }
}

const IS_MOCK_MODE = import.meta.env.VITE_USE_MOCKS === 'true'
const GOOGLE_OAUTH_ENV_FALLBACK = import.meta.env.VITE_GOOGLE_OAUTH_ENABLED === 'true'
const OAUTH_PENDING_KEY = 'gio_oauth_pending_google'
const AUTH_NOTICE_KEY = 'gio_auth_notice'
let googleOAuthEnabledPromise: Promise<boolean> | null = null

function readSessionStorage(key: string): string | null {
  if (typeof sessionStorage === 'undefined') return null
  return sessionStorage.getItem(key)
}

function writeSessionStorage(key: string, value: string): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(key, value)
}

function removeSessionStorage(key: string): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(key)
}

function clearOAuthTransientState(): void {
  removeSessionStorage(OAUTH_PENDING_KEY)
  removeSessionStorage(OAUTH_CALLBACK_CODE_KEY)
  removeSessionStorage(OAUTH_CALLBACK_SEEN_KEY)
  removeSessionStorage(OAUTH_CALLBACK_ERROR_KEY)
}

function stripOAuthParamsFromUrl(): void {
  if (typeof window === 'undefined') return

  try {
    const url = new URL(window.location.href)
    const currentSearch = url.search

    url.searchParams.delete('code')
    url.searchParams.delete('insforge_code')
    url.searchParams.delete('state')
    url.searchParams.delete('scope')
    url.searchParams.delete('authuser')
    url.searchParams.delete('prompt')
    url.searchParams.delete('error')
    url.searchParams.delete('error_description')

    if (url.search !== currentSearch) {
      window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`)
    }
  } catch {
    // Best effort cleanup only.
  }
}

async function exchangeOAuthCodeFallbackIfNeeded(): Promise<void> {
  const callbackCode = readSessionStorage(OAUTH_CALLBACK_CODE_KEY)
  if (!callbackCode) return

  removeSessionStorage(OAUTH_CALLBACK_CODE_KEY)
  const { error } = await insforgeClient.auth.exchangeOAuthCode(callbackCode)
  stripOAuthParamsFromUrl()

  if (error) throw error
}

function normalizeOAuthFailureNotice(error: unknown, callbackError: string | null): string {
  const rawCode = (error as { error?: string })?.error?.toLowerCase() ?? ''
  const rawMessage = (error instanceof Error ? error.message : String(error)).toLowerCase()
  const callbackCode = (callbackError ?? '').toLowerCase()

  if (callbackCode.includes('access_denied')) {
    return 'Has cancelado el acceso con Google. Puedes volver a intentarlo cuando quieras.'
  }

  if (callbackCode.includes('redirect') || rawCode.includes('redirect') || rawMessage.includes('redirect')) {
    return 'Google OAuth no está configurado para esta URL de despliegue. Revisa Redirect URLs en InsForge/Google.'
  }

  if (rawCode.includes('pkce_verifier_missing') || rawMessage.includes('code verifier')) {
    return 'No se pudo completar el inicio con Google. Inténtalo de nuevo sin cambiar de pestaña durante el proceso.'
  }

  if (rawCode.includes('invalid_refresh_token') || rawCode.includes('oauth') || rawMessage.includes('oauth')) {
    return 'No se pudo validar la sesión al volver de Google. Revisa la configuración OAuth en InsForge.'
  }

  return 'No se pudo completar el inicio con Google. Revisa configuración OAuth y vuelve a intentarlo.'
}

async function resolveGoogleOAuthEnabled(): Promise<boolean> {
  try {
    const { data, error } = await insforgeClient.auth.getPublicAuthConfig()
    if (error || !data) return GOOGLE_OAUTH_ENV_FALLBACK
    return data.oAuthProviders.includes('google')
  } catch {
    return GOOGLE_OAUTH_ENV_FALLBACK
  }
}

export function getGoogleOAuthEnabled(): Promise<boolean> {
  if (IS_MOCK_MODE) return Promise.resolve(true)

  if (!googleOAuthEnabledPromise) {
    googleOAuthEnabledPromise = resolveGoogleOAuthEnabled()
  }

  return googleOAuthEnabledPromise
}

export function consumeAuthNotice(): string | null {
  const notice = readSessionStorage(AUTH_NOTICE_KEY)
  if (notice) removeSessionStorage(AUTH_NOTICE_KEY)
  return notice
}

// Shape of the user object returned by the InsForge SDK
interface InsForgeUser {
  id: string
  email: string
  emailVerified: boolean
  providers: string[]
  createdAt: string
  updatedAt: string
  isProjectAdmin?: boolean
  is_project_admin?: boolean
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

function mapToUser(user: InsForgeUser, profileRole?: UserRole | null): User {
  const metadataRole = user.metadata?.role
  const isMetadataRole = metadataRole === 'admin' || metadataRole === 'client'
  const isProjectAdmin = user.isProjectAdmin === true || user.is_project_admin === true
  const fallbackRole = (isMetadataRole ? metadataRole : isProjectAdmin ? 'admin' : 'client') as UserRole

  return {
    id: user.id,
    email: user.email,
    fullName: user.profile?.name ?? user.email.split('@')[0],
    role: profileRole ?? fallbackRole,
    avatarUrl: user.profile?.avatar_url ?? undefined,
  }
}

export const authRepository = {
  async signIn(email: string, password: string): Promise<User> {
    try {
      const { data, error } = await insforgeClient.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (!data?.user) throw new Error('No se recibió usuario del servidor.')
      const profileRole = await fetchProfileRole(data.user.id)
      return mapToUser(data.user as InsForgeUser, profileRole)
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
      const profileRole = await fetchProfileRole(data.user.id)
      return mapToUser(data.user as InsForgeUser, profileRole)
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
      const profileRole = await fetchProfileRole(data.user.id)
      return mapToUser(data.user as InsForgeUser, profileRole)
    }

    try {
      writeSessionStorage(OAUTH_PENDING_KEY, '1')
      removeSessionStorage(AUTH_NOTICE_KEY)
      const redirectTo = `${window.location.origin}/auth`
      const { error } = await insforgeClient.auth.signInWithOAuth({
        provider: 'google',
        redirectTo,
      })
      if (error) throw error
      return null
    } catch (error) {
      removeSessionStorage(OAUTH_PENDING_KEY)
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
    const callbackError = readSessionStorage(OAUTH_CALLBACK_ERROR_KEY)

    // Fallback for providers that return `code` instead of `insforge_code`.
    try {
      await exchangeOAuthCodeFallbackIfNeeded()
    } catch (exchangeError) {
      writeSessionStorage(AUTH_NOTICE_KEY, normalizeOAuthFailureNotice(exchangeError, callbackError))
      clearOAuthTransientState()
      return null
    }

    const { data, error } = await insforgeClient.auth.getCurrentUser()

    if (error || !data?.user) {
      const hadPendingOAuth = readSessionStorage(OAUTH_PENDING_KEY) === '1'
      const hadOAuthCallback = readSessionStorage(OAUTH_CALLBACK_SEEN_KEY) === '1'
      const shouldReportOAuthFailure = Boolean(callbackError) || hadPendingOAuth || hadOAuthCallback

      if (shouldReportOAuthFailure) {
        writeSessionStorage(AUTH_NOTICE_KEY, normalizeOAuthFailureNotice(error, callbackError))
      }

      clearOAuthTransientState()
      return null
    }

    removeSessionStorage(AUTH_NOTICE_KEY)
    clearOAuthTransientState()
    const profileRole = await fetchProfileRole(data.user.id)
    return mapToUser(data.user as InsForgeUser, profileRole)
  },
}
