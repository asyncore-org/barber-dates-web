import { useEffect, useState } from 'react'
import { ADMIN_LOGIN_TIME_KEY, shouldForceAdminLogout } from '@/domain/user'
import { authRepository, consumeAuthNotice, getGoogleOAuthEnabled } from '@/infrastructure/auth'
import { useAuthStore } from '@/stores/authStore'

const ADMIN_SESSION_CHECK_INTERVAL_MS = 60 * 1000

async function forceLogoutAndClearSession(clearAuth: () => void): Promise<void> {
  try {
    await authRepository.signOut()
  } catch {
    // The local app session must still be cleared even if remote sign out fails.
  } finally {
    localStorage.removeItem(ADMIN_LOGIN_TIME_KEY)
    clearAuth()
  }
}

export function useAuth() {
  const { user, authChecked, setUser, setAuthChecked, clearAuth } = useAuthStore()
  const [isGoogleEnabled, setIsGoogleEnabled] = useState(
    import.meta.env.VITE_GOOGLE_OAUTH_ENABLED === 'true',
  )

  useEffect(() => {
    let isMounted = true

    const loadGoogleOAuthAvailability = async () => {
      const enabled = await getGoogleOAuthEnabled()
      if (!isMounted) return
      setIsGoogleEnabled(enabled)
    }

    void loadGoogleOAuthAvailability()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    // Guard: only bootstrap once per app lifecycle
    if (authChecked) return

    const bootstrap = async () => {
      const sessionUser = await authRepository.getSession()

      if (!sessionUser) {
        setAuthChecked(true)
        return
      }

      if (sessionUser.role === 'admin') {
        const raw = localStorage.getItem(ADMIN_LOGIN_TIME_KEY)
        if (shouldForceAdminLogout(raw)) {
          await forceLogoutAndClearSession(clearAuth)
          return
        }
      }

      setUser(sessionUser)
      setAuthChecked(true)
    }

    void bootstrap()
  }, [authChecked, clearAuth, setAuthChecked, setUser])

  useEffect(() => {
    if (!user || user.role !== 'admin') return

    const checkAdminSession = async () => {
      const raw = localStorage.getItem(ADMIN_LOGIN_TIME_KEY)
      if (!shouldForceAdminLogout(raw)) return
      await forceLogoutAndClearSession(clearAuth)
    }

    const intervalId = window.setInterval(() => {
      void checkAdminSession()
    }, ADMIN_SESSION_CHECK_INTERVAL_MS)

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      void checkAdminSession()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    void checkAdminSession()

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [user, clearAuth])

  const signIn = async (email: string, password: string): Promise<void> => {
    const sessionUser = await authRepository.signIn(email, password)
    if (sessionUser.role === 'admin') {
      localStorage.setItem(ADMIN_LOGIN_TIME_KEY, Date.now().toString())
    }
    setUser(sessionUser)
  }

  const signInWithGoogle = async (): Promise<void> => {
    const sessionUser = await authRepository.signInWithGoogle()
    if (!sessionUser) return

    if (sessionUser.role === 'admin') {
      localStorage.setItem(ADMIN_LOGIN_TIME_KEY, Date.now().toString())
    }

    setUser(sessionUser)
  }

  const signUp = async (email: string, password: string, fullName: string): Promise<void> => {
    const sessionUser = await authRepository.signUp(email, password, fullName)
    setUser(sessionUser)
  }

  const signOut = async (): Promise<void> => {
    let signOutError: unknown

    try {
      await authRepository.signOut()
    } catch (error) {
      signOutError = error
    } finally {
      localStorage.removeItem(ADMIN_LOGIN_TIME_KEY)
      clearAuth()
    }

    if (signOutError) throw signOutError
  }

  const requestPasswordReset = async (email: string): Promise<void> => {
    await authRepository.resetPasswordForEmail(email)
  }

  const updatePassword = async (password: string, otp: string): Promise<void> => {
    await authRepository.updatePassword(password, otp)
  }

  const readAuthNotice = (): string | null => consumeAuthNotice()

  return {
    user,
    authChecked,
    isGoogleEnabled,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    requestPasswordReset,
    updatePassword,
    readAuthNotice,
  }
}
