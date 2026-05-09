import type {
  IAppointmentRepository,
  Appointment,
  AppointmentStatus,
  CreateAppointmentData,
  UpdateAppointmentData,
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
  profiles?: { full_name: string | null } | null
}

// InsForge SDK returns profiles as an array for embedded joins; normalize before mapping
type AppointmentRowRaw = Omit<AppointmentRow, 'profiles'> & {
  profiles: Array<{ full_name: string | null }> | { full_name: string | null } | null
}

function normalizeRow(raw: AppointmentRowRaw): AppointmentRow {
  const profiles = Array.isArray(raw.profiles) ? (raw.profiles[0] ?? null) : (raw.profiles ?? null)
  return { ...raw, profiles }
}

function mapToAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.profiles?.full_name ?? undefined,
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

const SELECT_FIELDS_WITH_CLIENT =
  'id, client_id, barber_id, service_id, start_time, end_time, status, notes, created_at, profiles(full_name)'

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

  async getForBarber(barberId: string): Promise<Appointment[]> {
    const { data, error } = await insforgeClient.database
      .from('appointments')
      .select(SELECT_FIELDS_WITH_CLIENT)
      .eq('barber_id', barberId)
      .order('start_time', { ascending: false })
    if (error) throw error
    return ((data ?? []) as AppointmentRowRaw[]).map((row) => mapToAppointment(normalizeRow(row)))
  }

  async getAll(): Promise<Appointment[]> {
    const { data, error } = await insforgeClient.database
      .from('appointments')
      .select(SELECT_FIELDS_WITH_CLIENT)
      .order('start_time', { ascending: false })
    if (error) throw error
    return ((data ?? []) as AppointmentRowRaw[]).map((row) => mapToAppointment(normalizeRow(row)))
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

  async updateAppointment(id: string, data: UpdateAppointmentData): Promise<void> {
    const { error } = await insforgeClient.database
      .from('appointments')
      .update({
        start_time: data.startTime,
        end_time: data.endTime,
        barber_id: data.barberId,
        service_id: data.serviceId,
      })
      .eq('id', id)
    if (error) throw error
  }
}
