import { http, HttpResponse } from 'msw'
import { getMockUser } from '../data/users'

interface SupabaseSession {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: Record<string, unknown>
}

// In-memory auth state — resets on page reload (intentional: see KNOWLEDGE.md)
let currentSession: SupabaseSession | null = null

function buildSupabaseUser(user: ReturnType<typeof getMockUser>) {
  return {
    id: user.id,
    email: user.email,
    role: 'authenticated',
    aud: 'authenticated',
    created_at: user.created_at,
    app_metadata: { provider: 'email', role: user.role },
    user_metadata: {
      full_name: user.full_name,
      phone: user.phone,
      loyalty_points: user.loyalty_points,
    },
  }
}

export const authHandlers = [
  // GET /auth/v1/user — devuelve usuario si hay sesión activa, 401 si no
  http.get('*/auth/v1/user', ({ request }) => {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token || !currentSession || token !== currentSession.access_token) {
      return HttpResponse.json(
        { message: 'invalid claim: missing sub claim' },
        { status: 401 },
      )
    }
    return HttpResponse.json(currentSession.user)
  }),

  // POST /auth/v1/token?grant_type=password — login fake con cualquier credencial
  http.post('*/auth/v1/token', () => {
    const user = getMockUser()
    const accessToken = `mock-token-${user.role}-${Date.now()}`
    currentSession = {
      access_token: accessToken,
      refresh_token: `mock-refresh-${Date.now()}`,
      token_type: 'bearer',
      expires_in: 3600,
      user: buildSupabaseUser(user),
    }
    return HttpResponse.json(currentSession)
  }),

  // POST /auth/v1/signup — registro fake (respeta VITE_MOCK_ROLE)
  http.post('*/auth/v1/signup', () => {
    const user = getMockUser()
    const accessToken = `mock-token-${user.role}-${Date.now()}`
    currentSession = {
      access_token: accessToken,
      refresh_token: `mock-refresh-${Date.now()}`,
      token_type: 'bearer',
      expires_in: 3600,
      user: buildSupabaseUser(user),
    }
    return HttpResponse.json(currentSession)
  }),

  // POST /auth/v1/logout
  http.post('*/auth/v1/logout', () => {
    currentSession = null
    return new HttpResponse(null, { status: 204 })
  }),
]
