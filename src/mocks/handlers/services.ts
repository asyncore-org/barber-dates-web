import { http, HttpResponse } from 'msw'
import { mockServices } from '../data/services'

export const servicesHandlers = [
  http.get('*/rest/v1/services', ({ request }) => {
    const url = new URL(request.url)
    const activeFilter = url.searchParams.get('is_active')
    if (activeFilter === 'eq.true') {
      return HttpResponse.json(mockServices.filter(s => s.is_active))
    }
    return HttpResponse.json(mockServices)
  }),
]
