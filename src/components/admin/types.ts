export interface WeekAppt {
  id: string
  day: number       // 0=Mon … 5=Sat
  startH: number
  startM: number
  durationMin: number
  client: string
  service: string   // display name matching MOCK_SERVICES
  barberId: string
  color: 'led' | 'brick' | 'gold'
}

export interface RescheduleUpdate {
  serviceId: string
  barberId: string
  date: Date
  slot: string      // "HH:MM"
}
