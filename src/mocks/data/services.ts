export interface MockService {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number
  loyalty_points: number
  is_active: boolean
  sort_order: number
}

export const mockServices: MockService[] = [
  {
    id: 'svc-0001',
    name: 'Corte clásico',
    description: 'Corte de cabello tradicional con tijera y máquina, acabado con navaja.',
    duration_minutes: 20,
    price: 15,
    loyalty_points: 10,
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'svc-0002',
    name: 'Degradado (Fade)',
    description: 'Degradado suave o a piel, con volumen en la parte superior.',
    duration_minutes: 30,
    price: 20,
    loyalty_points: 15,
    is_active: true,
    sort_order: 2,
  },
  {
    id: 'svc-0003',
    name: 'Corte + Barba',
    description: 'Corte completo más arreglo y definición de barba con navaja.',
    duration_minutes: 45,
    price: 25,
    loyalty_points: 20,
    is_active: true,
    sort_order: 3,
  },
  {
    id: 'svc-0004',
    name: 'Arreglo de barba',
    description: 'Perfilado, afeitado y definición de barba con toalla caliente.',
    duration_minutes: 20,
    price: 12,
    loyalty_points: 8,
    is_active: true,
    sort_order: 4,
  },
  {
    id: 'svc-0005',
    name: 'Cejas',
    description: 'Depilación y perfilado de cejas con hilo o cera.',
    duration_minutes: 10,
    price: 8,
    loyalty_points: 5,
    is_active: true,
    sort_order: 5,
  },
]
