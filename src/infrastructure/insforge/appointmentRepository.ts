import type {
  IAppointmentRepository,
  Appointment,
  AppointmentStatus,
  CreateAppointmentData,
} from '@/domain/appointment'
import { insforgeClient } from './client'

interface AppointmentRow {
  id: string
  client_id: string
  barber_id: string
  service_id: string
  start_time: string
  end_time: string
  status: string
  notes: string | null
  created_at: string
}

function mapToAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    clientId: row.client_id,
    barberId: row.barber_id,
    serviceId: row.service_id,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status as AppointmentStatus,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

const SELECT_FIELDS =
  'id, client_id, barber_id, service_id, start_time, end_time, status, notes, created_at'

export class InsForgeAppointmentRepository implements IAppointmentRepository {
  async getForClient(clientId: string): Promise<Appointment[]> {
    const { data, error } = await insforgeClient.database
      .from('appointments')
      .select(SELECT_FIELDS)
      .eq('client_id', clientId)
      .order('start_time', { ascending: false })
    if (error) throw error
    return ((data ?? []) as AppointmentRow[]).map(mapToAppointment)
  }

  async getAll(): Promise<Appointment[]> {
    const { data, error } = await insforgeClient.database
      .from('appointments')
      .select(SELECT_FIELDS)
      .order('start_time', { ascending: false })
    if (error) throw error
    return ((data ?? []) as AppointmentRow[]).map(mapToAppointment)
  }

  async create(appt: CreateAppointmentData): Promise<Appointment> {
    const { data, error } = await insforgeClient.database
      .from('appointments')
      .insert({
        client_id: appt.clientId,
        barber_id: appt.barberId,
        service_id: appt.serviceId,
        start_time: appt.startTime,
        end_time: appt.endTime,
        notes: appt.notes ?? null,
      })
      .select(SELECT_FIELDS)
      .single()
    if (error) throw error
    return mapToAppointment(data as AppointmentRow)
  }

  async cancel(id: string): Promise<void> {
    const { error } = await insforgeClient.database
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', id)
    if (error) throw error
  }

  async updateStatus(id: string, status: AppointmentStatus): Promise<void> {
    const { error } = await insforgeClient.database
      .from('appointments')
      .update({ status })
      .eq('id', id)
    if (error) throw error
  }
}
