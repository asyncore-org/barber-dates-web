import { useEffect } from 'react'
import { ADMIN_LOGIN_TIME_KEY, isAdminSessionExpired } from '@/domain/user'
import { authRepository } from '@/infrastructure/auth'
import { useAuthStore } from '@/stores/authStore'

export function useAuth() {
  const { user, authChecked, setUser, setAuthChecked, clearAuth } = useAuthStore()

  useEffect(() => {
    // Guard: only bootstrap once per app lifecycle
    if (authChecked) return

    authRepository.getSession().then((sessionUser) => {
      if (!sessionUser) {
        setAuthChecked(true)
        return
      }

      if (sessionUser.role === 'admin') {
        const raw = localStorage.getItem(ADMIN_LOGIN_TIME_KEY)
        if (!raw || isAdminSessionExpired(parseInt(raw, 10))) {
          authRepository.signOut().then(() => clearAuth())
          return
        }
      }

      setUser(sessionUser)
      setAuthChecked(true)
    })
  }, [authChecked]) // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = async (email: string, password: string): Promise<void> => {
    const sessionUser = await authRepository.signIn(email, password)
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
    await authRepository.signOut()
    localStorage.removeItem(ADMIN_LOGIN_TIME_KEY)
    clearAuth()
  }

  return { user, authChecked, signIn, signUp, signOut }
}
