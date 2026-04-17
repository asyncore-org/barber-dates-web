export interface MockService {
  id: string
  name: string
  description: string
  duration_minutes: number
  price: number
  is_active: boolean
  created_at: string
}

export const mockServices: MockService[] = [
  {
    id: 'svc-0001',
    name: 'Corte clásico',
    description: 'Corte de cabello tradicional con tijera y máquina, acabado con navaja.',
    duration_minutes: 20,
    price: 15,
    is_active: true,
    created_at: '2025-06-01T09:00:00.000Z',
  },
  {
    id: 'svc-0002',
    name: 'Degradado (Fade)',
    description: 'Degradado suave o a piel, con volumen en la parte superior.',
    duration_minutes: 30,
    price: 20,
    is_active: true,
    created_at: '2025-06-01T09:00:00.000Z',
  },
  {
    id: 'svc-0003',
    name: 'Corte + Barba',
    description: 'Corte completo más arreglo y definición de barba con navaja.',
    duration_minutes: 45,
    price: 25,
    is_active: true,
    created_at: '2025-06-01T09:00:00.000Z',
  },
  {
    id: 'svc-0004',
    name: 'Arreglo de barba',
    description: 'Perfilado, afeitado y definición de barba con toalla caliente.',
    duration_minutes: 20,
    price: 12,
    is_active: true,
    created_at: '2025-06-01T09:00:00.000Z',
  },
  {
    id: 'svc-0005',
    name: 'Cejas',
    description: 'Depilación y perfilado de cejas con hilo o cera.',
    duration_minutes: 10,
    price: 8,
    is_active: true,
    created_at: '2025-06-01T09:00:00.000Z',
  },
]
