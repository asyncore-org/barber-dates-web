export interface MockBarber {
  id: string
  full_name: string
  bio: string | null
  avatar_url: string | null
  specialty_ids: string[]
  is_active: boolean
  created_at: string
}

export const mockBarbers: MockBarber[] = [
  {
    id: 'a1b2c3d4-0000-0000-0000-000000000002',
    full_name: 'Giovanni Russo',
    bio: 'Fundador de Gio Barber Shop. Más de 15 años de experiencia en cortes clásicos y modernos.',
    avatar_url: null,
    specialty_ids: ['svc-0001', 'svc-0002', 'svc-0003', 'svc-0004', 'svc-0005'],
    is_active: true,
    created_at: '2025-06-01T09:00:00.000Z',
  },
  {
    id: 'b2c3d4e5-0000-0000-0000-000000000003',
    full_name: 'Marco López',
    bio: 'Especialista en degradados y diseños modernos. 8 años de experiencia.',
    avatar_url: null,
    specialty_ids: ['svc-0001', 'svc-0002', 'svc-0004'],
    is_active: true,
    created_at: '2025-09-15T09:00:00.000Z',
  },
]
