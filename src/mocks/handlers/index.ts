import { authHandlers } from './auth'
import { servicesHandlers } from './services'
import { barbersHandlers } from './barbers'
import { appointmentsHandlers } from './appointments'

export const handlers = [
  ...authHandlers,
  ...servicesHandlers,
  ...barbersHandlers,
  ...appointmentsHandlers,
]
