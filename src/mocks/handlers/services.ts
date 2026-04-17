import { http, HttpResponse } from 'msw'
import { mockServices } from '../data/services'

export const servicesHandlers = [
  http.get('*/rest/v1/services', () => {
    return HttpResponse.json(mockServices)
  }),
]
