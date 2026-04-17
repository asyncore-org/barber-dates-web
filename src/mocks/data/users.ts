export type MockRole = 'client' | 'admin'

export interface MockUser {
  id: string
  email: string
  full_name: string
  role: MockRole
  phone: string | null
  avatar_url: string | null
  loyalty_points: number
  created_at: string
}

export const mockUsers: Record<MockRole, MockUser> = {
  client: {
    id: 'a1b2c3d4-0000-0000-0000-000000000001',
    email: 'carlos@example.com',
    full_name: 'Carlos Romero',
    role: 'client',
    phone: '+34 612 345 678',
    avatar_url: null,
    loyalty_points: 150,
    created_at: '2026-01-10T10:00:00.000Z',
  },
  admin: {
    id: 'a1b2c3d4-0000-0000-0000-000000000002',
    email: 'gio@giobarber.com',
    full_name: 'Giovanni Russo',
    role: 'admin',
    phone: '+34 623 456 789',
    avatar_url: null,
    loyalty_points: 0,
    created_at: '2025-06-01T09:00:00.000Z',
  },
}

export function getMockUser(): MockUser {
  const role = (import.meta.env.VITE_MOCK_ROLE as MockRole) ?? 'client'
  return mockUsers[role] ?? mockUsers.client
}
