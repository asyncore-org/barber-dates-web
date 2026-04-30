export type AppointmentStatus = 'confirmed' | 'completed' | 'cancelled' | 'no_show'

/** Business rule: cancellations allowed up to this many hours before start (Art. 4) */
export const CANCELLATION_LIMIT_HOURS = 2

export interface Appointment {
  id: string
  clientId: string
  clientName?: string
  barberId: string
  serviceId: string
  /** ISO datetime string */
  startTime: string
  /** ISO datetime string */
  endTime: string
  status: AppointmentStatus
  notes: string | null
  createdAt: string
}

export interface CreateAppointmentData {
  clientId: string
  barberId: string
  serviceId: string
  startTime: string
  endTime: string
  notes?: string
}

/** Pure function — returns true if cancellation is still allowed (Art. 4 rule 2) */
export function canCancelAppointment(
  startTime: string,
  nowTimestamp: number = Date.now(),
): boolean {
  const start = new Date(startTime).getTime()
  const limitMs = CANCELLATION_LIMIT_HOURS * 60 * 60 * 1000
  return start - nowTimestamp > limitMs
}

export interface UpdateAppointmentData {
  startTime: string
  endTime: string
  barberId: string
  serviceId: string
}

export interface IAppointmentRepository {
  getForClient(clientId: string): Promise<Appointment[]>
  getAll(): Promise<Appointment[]>
  create(data: CreateAppointmentData): Promise<Appointment>
  cancel(id: string): Promise<void>
  updateStatus(id: string, status: AppointmentStatus): Promise<void>
  updateAppointment(id: string, data: UpdateAppointmentData): Promise<void>
}
