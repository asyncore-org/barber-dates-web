import { http, HttpResponse } from 'msw'
import { mockAppointments, type MockAppointment } from '../data/appointments'

// In-memory store inicializado con los fixtures — resetea al recargar la página
const appointmentsStore: MockAppointment[] = [...mockAppointments]

export const appointmentsHandlers = [
  // GET /rest/v1/appointments — Supabase envía filtros como query params (ej: client_id=eq.xxx)
  http.get('*/rest/v1/appointments', ({ request }) => {
    const url = new URL(request.url)
    const clientIdFilter = url.searchParams.get('client_id')

    let result = appointmentsStore
    if (clientIdFilter?.startsWith('eq.')) {
      const clientId = clientIdFilter.replace('eq.', '')
      result = appointmentsStore.filter((a) => a.client_id === clientId)
    }

    return HttpResponse.json(result)
  }),

  // POST /rest/v1/appointments — crea cita (en memoria, se pierde al recargar)
  http.post('*/rest/v1/appointments', async ({ request }) => {
    const body = (await request.json()) as Omit<MockAppointment, 'id' | 'created_at'>
    const newAppointment: MockAppointment = {
      ...body,
      id: `apt-${Date.now()}`,
      created_at: new Date().toISOString(),
    }
    appointmentsStore.push(newAppointment)
    return HttpResponse.json(newAppointment, { status: 201 })
  }),

  // PATCH /rest/v1/appointments — actualiza estado (ej: cancelar cita)
  http.patch('*/rest/v1/appointments', async ({ request }) => {
    const url = new URL(request.url)
    const idFilter = url.searchParams.get('id')?.replace('eq.', '')
    const body = (await request.json()) as Partial<MockAppointment>

    const index = appointmentsStore.findIndex((a) => a.id === idFilter)
    if (index === -1) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }

    appointmentsStore[index] = { ...appointmentsStore[index], ...body }
    return HttpResponse.json(appointmentsStore[index])
  }),
]
