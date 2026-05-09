import { create } from 'zustand'
import type { User } from '@/domain/user'

interface AuthState {
  user: User | null
  authChecked: boolean
  setUser: (user: User | null) => void
  setAuthChecked: (checked: boolean) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  authChecked: false,
  setUser: (user) => set({ user }),
  setAuthChecked: (authChecked) => set({ authChecked }),
  // clearAuth marks session as checked (avoids re-triggering bootstrap) and clears user
  clearAuth: () => set({ user: null, authChecked: true }),
}))
