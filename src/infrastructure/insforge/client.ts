import { createClient } from '@insforge/sdk'

export const OAUTH_CALLBACK_ERROR_KEY = 'gio_oauth_callback_error'
export const OAUTH_CALLBACK_SEEN_KEY = 'gio_oauth_callback_seen'

function readRequiredEnv(name: 'VITE_INSFORGE_URL' | 'VITE_INSFORGE_ANON_KEY'): string {
  const value = import.meta.env[name]
  if (typeof value === 'string' && value.trim().length > 0) return value

  throw new Error(
    `Falta la variable ${name}. Configura .env.local en desarrollo o variables VITE_* en CI/CD.`,
  )
}

function captureOAuthCallbackSignals(): void {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return

  try {
    const params = new URLSearchParams(window.location.search)
    const oauthError = params.get('error')
    if (oauthError) {
      sessionStorage.setItem(OAUTH_CALLBACK_ERROR_KEY, oauthError)
    }

    if (params.has('insforge_code')) {
      sessionStorage.setItem(OAUTH_CALLBACK_SEEN_KEY, '1')
    }
  } catch {
    // Non-blocking: auth can still proceed without these diagnostics.
  }
}

captureOAuthCallbackSignals()

export const insforgeClient = createClient({
  baseUrl: readRequiredEnv('VITE_INSFORGE_URL'),
  anonKey: readRequiredEnv('VITE_INSFORGE_ANON_KEY'),
})
