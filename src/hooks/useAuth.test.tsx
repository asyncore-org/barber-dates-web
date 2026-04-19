import { act, renderHook, waitFor } from '@testing-library/react'
import { type User, ADMIN_LOGIN_TIME_KEY } from '@/domain/user'
import { authRepository } from '@/infrastructure/auth'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from './useAuth'

vi.mock('@/infrastructure/auth', () => ({
  authRepository: {
    getSession: vi.fn(),
    signOut: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
  },
}))

const adminUser: User = {
  id: 'admin-1',
  email: 'admin@gio.test',
  fullName: 'Admin Gio',
  role: 'admin',
}

const mockedGetSession = vi.mocked(authRepository.getSession)
const mockedSignOut = vi.mocked(authRepository.signOut)

function createLocalStorageMock(): Storage {
  const store = new Map<string, string>()

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    },
  }
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    vi.stubGlobal('localStorage', createLocalStorageMock())
    localStorage.removeItem(ADMIN_LOGIN_TIME_KEY)
    useAuthStore.setState({ user: null, authChecked: false })
    mockedGetSession.mockResolvedValue(null)
    mockedSignOut.mockResolvedValue()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('forces logout on bootstrap when admin timestamp is invalid', async () => {
    mockedGetSession.mockResolvedValue(adminUser)
    mockedSignOut.mockRejectedValue(new Error('network'))
    localStorage.setItem(ADMIN_LOGIN_TIME_KEY, 'invalid-number')

    renderHook(() => useAuth())

    await waitFor(() => {
      expect(mockedSignOut).toHaveBeenCalledTimes(1)
      expect(useAuthStore.getState().authChecked).toBe(true)
      expect(useAuthStore.getState().user).toBeNull()
    })

    expect(localStorage.getItem(ADMIN_LOGIN_TIME_KEY)).toBeNull()
  })

  it('forces logout at runtime when an admin session is already expired', async () => {
    const expiredLoginTimestamp = Date.now() - 16 * 24 * 60 * 60 * 1000
    localStorage.setItem(ADMIN_LOGIN_TIME_KEY, String(expiredLoginTimestamp))

    act(() => {
      useAuthStore.setState({ user: adminUser, authChecked: true })
    })

    renderHook(() => useAuth())

    await waitFor(() => {
      expect(mockedSignOut).toHaveBeenCalledTimes(1)
      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().authChecked).toBe(true)
    })
  })

  it('clears local session even when manual signOut fails remotely', async () => {
    mockedSignOut.mockRejectedValue(new Error('remote failed'))

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(useAuthStore.getState().authChecked).toBe(true)
    })

    act(() => {
      useAuthStore.setState({ user: adminUser, authChecked: true })
    })
    localStorage.setItem(ADMIN_LOGIN_TIME_KEY, String(Date.now()))

    await expect(
      act(async () => {
        await result.current.signOut()
      })
    ).rejects.toThrow('remote failed')

    expect(useAuthStore.getState().user).toBeNull()
    expect(localStorage.getItem(ADMIN_LOGIN_TIME_KEY)).toBeNull()
  })
})
