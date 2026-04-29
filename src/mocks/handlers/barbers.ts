import { http, HttpResponse } from 'msw'
import { mockBarbers } from '../data/barbers'

export const barbersHandlers = [
  http.get('*/rest/v1/barbers', ({ request }) => {
    const url = new URL(request.url)
    const activeFilter = url.searchParams.get('is_active')
    if (activeFilter === 'eq.true') {
      return HttpResponse.json(mockBarbers.filter(b => b.is_active))
    }
    return HttpResponse.json(mockBarbers)
  }),
]
