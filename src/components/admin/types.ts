export interface WeekAppt {
  id: string
  day: number       // 0=Mon … 5=Sat
  startH: number
  startM: number
  durationMin: number
  client: string
  clientId: string
  service: string   // display name (matches Service.name)
  barberId: string
  color: 'led' | 'brick' | 'gold'
}

export interface RescheduleUpdate {
  serviceId: string
  barberId: string
  date: Date
  slot: string      // "HH:MM"
}
