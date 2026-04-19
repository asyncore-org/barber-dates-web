import { http, HttpResponse } from 'msw'
import { getMockUser } from '../data/users'

interface MockSession {
  accessToken: string
  refreshToken: string
  csrfToken: string
  user: Record<string, unknown>
}

// In-memory auth state — resets on page reload (intentional: see KNOWLEDGE.md)
let currentSession: MockSession | null = null

function buildInsForgeUser(user: ReturnType<typeof getMockUser>) {
  return {
    id: user.id,
    email: user.email,
    emailVerified: true,
    providers: ['email'],
    createdAt: user.created_at,
    updatedAt: new Date().toISOString(),
    profile: {
      name: user.full_name,
      avatar_url: user.avatar_url,
    },
    metadata: { role: user.role, phone: user.phone, loyalty_points: user.loyalty_points },
  }
}

function createSession() {
  const user = getMockUser()
  currentSession = {
    accessToken: `mock-token-${user.role}-${Date.now()}`,
    refreshToken: `mock-refresh-${Date.now()}`,
    csrfToken: `mock-csrf-${Date.now()}`,
    user: buildInsForgeUser(user),
  }
  return currentSession
}

export const authHandlers = [
  // POST /api/auth/sessions — login fake con cualquier credencial
  http.post('*/api/auth/sessions', () => {
    const session = createSession()
    return HttpResponse.json(session)
  }),

  // POST /api/auth/users — registro fake
  http.post('*/api/auth/users', () => {
    const session = createSession()
    return HttpResponse.json({ ...session, requireEmailVerification: false })
  }),

  // POST /api/auth/logout
  http.post('*/api/auth/logout', () => {
    currentSession = null
    return HttpResponse.json({ success: true })
  }),

  // POST /api/auth/refresh — en mocks evitamos 401 para no ruido en bootstrap
  http.post('*/api/auth/refresh', () => {
    if (!currentSession) {
      return HttpResponse.json({ accessToken: null, user: null })
    }
    return HttpResponse.json(currentSession)
  }),

  // GET /api/auth/sessions/current
  http.get('*/api/auth/sessions/current', ({ request }) => {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token || !currentSession || token !== currentSession.accessToken) {
      return HttpResponse.json({ user: null }, { status: 401 })
    }
    return HttpResponse.json({ user: currentSession.user })
  }),

  // GET /api/auth/public-config
  http.get('*/api/auth/public-config', () => {
    return HttpResponse.json({
      requireEmailVerification: false,
      passwordMinLength: 8,
      requireNumber: false,
      requireLowercase: false,
      requireUppercase: false,
      requireSpecialChar: false,
      verifyEmailMethod: 'link',
      resetPasswordMethod: 'link',
      oAuthProviders: ['google'],
      customOAuthProviders: [],
    })
  }),

  // POST /api/auth/email/send-reset-password
  http.post('*/api/auth/email/send-reset-password', () => {
    return HttpResponse.json({ success: true, message: 'Recovery email sent (mock)' })
  }),

  // POST /api/auth/email/reset-password
  http.post('*/api/auth/email/reset-password', async ({ request }) => {
    const body = (await request.json()) as { newPassword?: string; otp?: string }
    if (!body.newPassword || !body.otp) {
      return HttpResponse.json({ error: 'INVALID_REQUEST', message: 'Missing data' }, { status: 400 })
    }
    return HttpResponse.json({ success: true, message: 'Password updated (mock)' })
  }),
]
