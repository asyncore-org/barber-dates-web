export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export interface MockAppointment {
  id: string
  client_id: string
  barber_id: string
  service_id: string
  scheduled_at: string
  duration_minutes: number
  status: AppointmentStatus
  notes: string | null
  price: number
  created_at: string
}

const CLIENT_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

export const mockAppointments: MockAppointment[] = [
  // Pasadas — completadas
  {
    id: 'apt-0001',
    client_id: CLIENT_ID,
    barber_id: 'a1b2c3d4-0000-0000-0000-000000000002',
    service_id: 'svc-0001',
    scheduled_at: '2026-03-10T10:00:00.000Z',
    duration_minutes: 20,
    status: 'completed',
    notes: null,
    price: 15,
    created_at: '2026-03-09T18:00:00.000Z',
  },
  {
    id: 'apt-0002',
    client_id: CLIENT_ID,
    barber_id: 'b2c3d4e5-0000-0000-0000-000000000003',
    service_id: 'svc-0003',
    scheduled_at: '2026-04-01T11:30:00.000Z',
    duration_minutes: 45,
    status: 'completed',
    notes: 'Dejar más largo en la parte superior.',
    price: 25,
    created_at: '2026-03-30T09:00:00.000Z',
  },
  // Futuras — confirmadas
  {
    id: 'apt-0003',
    client_id: CLIENT_ID,
    barber_id: 'a1b2c3d4-0000-0000-0000-000000000002',
    service_id: 'svc-0002',
    scheduled_at: '2026-04-25T10:00:00.000Z',
    duration_minutes: 30,
    status: 'confirmed',
    notes: null,
    price: 20,
    created_at: '2026-04-17T14:00:00.000Z',
  },
  {
    id: 'apt-0004',
    client_id: CLIENT_ID,
    barber_id: 'b2c3d4e5-0000-0000-0000-000000000003',
    service_id: 'svc-0004',
    scheduled_at: '2026-05-02T12:00:00.000Z',
    duration_minutes: 20,
    status: 'confirmed',
    notes: null,
    price: 12,
    created_at: '2026-04-17T15:00:00.000Z',
  },
  // Pendientes de confirmación
  {
    id: 'apt-0005',
    client_id: CLIENT_ID,
    barber_id: 'a1b2c3d4-0000-0000-0000-000000000002',
    service_id: 'svc-0003',
    scheduled_at: '2026-05-10T09:30:00.000Z',
    duration_minutes: 45,
    status: 'pending',
    notes: 'Primera visita.',
    price: 25,
    created_at: '2026-04-17T16:00:00.000Z',
  },
  {
    id: 'apt-0006',
    client_id: CLIENT_ID,
    barber_id: 'b2c3d4e5-0000-0000-0000-000000000003',
    service_id: 'svc-0001',
    scheduled_at: '2026-05-15T17:00:00.000Z',
    duration_minutes: 20,
    status: 'pending',
    notes: null,
    price: 15,
    created_at: '2026-04-17T17:00:00.000Z',
  },
]
