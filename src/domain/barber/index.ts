export interface Barber {
  id: string
  fullName: string
  role: string | null
  bio: string | null
  avatarUrl: string | null
  phone: string | null
  email: string | null
  /** IDs of services this barber offers */
  specialtyIds: string[]
  isActive: boolean
  /** Daily break window — HH:MM format, nullable when no break configured */
  breakStart: string | null
  breakEnd: string | null
}

export interface CreateBarberData {
  fullName: string
  role?: string
  bio?: string
  phone?: string
  email?: string
}

export interface UpdateBarberData {
  fullName?: string
  role?: string
  bio?: string
  phone?: string
  email?: string
  isActive?: boolean
  breakStart?: string | null
  breakEnd?: string | null
}

export interface IBarberRepository {
  getActive(): Promise<Barber[]>
  getAll(): Promise<Barber[]>
  create(data: CreateBarberData): Promise<Barber>
  update(id: string, data: UpdateBarberData): Promise<Barber>
  delete(id: string): Promise<void>
}
