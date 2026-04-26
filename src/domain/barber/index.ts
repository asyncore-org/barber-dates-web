export interface Barber {
  id: string
  fullName: string
  bio: string | null
  avatarUrl: string | null
  /** IDs of services this barber offers */
  specialtyIds: string[]
  isActive: boolean
}

export interface IBarberRepository {
  getActive(): Promise<Barber[]>
  getAll(): Promise<Barber[]>
}
