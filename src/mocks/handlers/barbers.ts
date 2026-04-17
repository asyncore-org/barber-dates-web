import { http, HttpResponse } from 'msw'
import { mockBarbers } from '../data/barbers'

export const barbersHandlers = [
  // Supabase filtra perfiles de barberos con ?role=eq.admin o vía join
  // El handler devuelve todos los barberos activos sin filtrar (simplificado para mocks)
  http.get('*/rest/v1/profiles', () => {
    return HttpResponse.json(mockBarbers.filter((b) => b.is_active))
  }),
]
