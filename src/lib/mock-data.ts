export interface MockService {
  id: string
  name: string
  duration: number
  price: number
  points: number
  active: boolean
}

export interface MockBarber {
  id: string
  name: string
  role: string
  initials: string
  active: boolean
  phone?: string
  email?: string
}

export interface MockAppointment {
  id: string
  dateISO: string
  time: string
  serviceId: string
  barberId: string
  status: 'upcoming' | 'done' | 'cancelled'
}

export interface MockHistoryEntry {
  id: string
  date: string
  serviceId: string
  barberId: string
  price: number
  points: number
}

export interface MockLoyalty {
  points: number
  target: number
  stamps: number
  totalVisits: number
  totalSpent: number
  yearVisits: number
  redeemedCount: number
  memberCode: string
}

export interface MockReward {
  id: string
  label: string
  cost: number
  active: boolean
}

export interface MockShop {
  name: string
  phone: string
  email: string
  instagram: string
  address: string
  description: string
  allowBarberChoice: boolean
}

export interface MockHourEntry {
  name: string
  open: boolean
  from: string
  to: string
  barberIds: string[]
}

export interface MockClosure {
  id: string
  date: string
  reason: string
  all: boolean
  closingTime?: string
  barberIds?: string[]
}

export const MOCK_SERVICES: MockService[] = [
  { id: 's1', name: 'Corte Clásico', duration: 30, price: 15, points: 10, active: true },
  { id: 's2', name: 'Corte + Barba', duration: 45, price: 22, points: 15, active: true },
  { id: 's3', name: 'Afeitado Tradicional', duration: 30, price: 14, points: 10, active: true },
  { id: 's4', name: 'Corte Premium', duration: 60, price: 30, points: 20, active: true },
  { id: 's5', name: 'Tinte + Corte', duration: 75, price: 38, points: 25, active: true },
  { id: 's6', name: 'Niños (-12)', duration: 25, price: 12, points: 8, active: true },
]

export const MOCK_BARBERS: MockBarber[] = [
  { id: 'b1', name: 'Gio', role: 'Maestro barbero', initials: 'GV', active: true, phone: '641 36 13 52', email: 'gio@giobarber.es' },
  { id: 'b2', name: 'Marcos', role: 'Barbero', initials: 'MC', active: true, phone: '612 44 78 91', email: 'marcos@giobarber.es' },
  { id: 'b3', name: 'Lucía', role: 'Barbera', initials: 'LP', active: false, phone: '698 21 05 37', email: 'lucia@giobarber.es' },
]

export const MOCK_APPOINTMENTS: MockAppointment[] = [
  {
    id: 'a1',
    dateISO: new Date(Date.now() + 2 * 86400000).toISOString(),
    time: '17:00',
    serviceId: 's2',
    barberId: 'b1',
    status: 'upcoming',
  },
]

export const MOCK_HISTORY: MockHistoryEntry[] = [
  { id: 'h1', date: '08 Abr 2026', serviceId: 's1', barberId: 'b2', price: 15, points: 10 },
  { id: 'h2', date: '15 Mar 2026', serviceId: 's2', barberId: 'b1', price: 22, points: 15 },
  { id: 'h3', date: '22 Feb 2026', serviceId: 's3', barberId: 'b3', price: 14, points: 10 },
  { id: 'h4', date: '03 Feb 2026', serviceId: 's4', barberId: 'b1', price: 30, points: 20 },
  { id: 'h5', date: '11 Ene 2026', serviceId: 's1', barberId: 'b2', price: 15, points: 10 },
]

export const MOCK_LOYALTY: MockLoyalty = {
  points: 65,
  target: 100,
  stamps: 7,
  totalVisits: 27,
  totalSpent: 412,
  yearVisits: 7,
  redeemedCount: 2,
  memberCode: '#GIO·0421',
}

export const MOCK_REWARDS: MockReward[] = [
  { id: 'r1', label: 'Corte gratis', cost: 100, active: true },
  { id: 'r2', label: '-20% en tinte', cost: 50, active: true },
  { id: 'r3', label: 'Barba gratis con corte', cost: 75, active: true },
  { id: 'r4', label: 'Cerveza de la casa', cost: 25, active: true },
]

export const MOCK_SHOP: MockShop = {
  name: 'Gio Barber Shop',
  phone: '641 36 13 52',
  email: 'hola@giobarber.es',
  instagram: '@gio_barber_19',
  address: 'Calle Mayor 42, 28013 Madrid',
  description: 'Barbería moderna con luces LED hexagonales, pared de ladrillo visto y ambiente masculino.',
  allowBarberChoice: true,
}

export const MOCK_HOURS: MockHourEntry[] = [
  { name: 'Lunes',     open: false, from: '',      to: '',      barberIds: [] },
  { name: 'Martes',   open: true,  from: '10:00', to: '20:00', barberIds: ['b1', 'b2'] },
  { name: 'Miércoles',open: true,  from: '10:00', to: '20:00', barberIds: ['b1', 'b2'] },
  { name: 'Jueves',   open: true,  from: '10:00', to: '20:00', barberIds: ['b1', 'b2'] },
  { name: 'Viernes',  open: true,  from: '10:00', to: '21:00', barberIds: ['b1', 'b2'] },
  { name: 'Sábado',   open: true,  from: '09:00', to: '15:00', barberIds: ['b1'] },
  { name: 'Domingo',  open: false, from: '',      to: '',      barberIds: [] },
]

export const MOCK_CLOSURES: MockClosure[] = [
  { id: 'c1', date: '01 May 2026', reason: 'Día del trabajador', all: true },
  { id: 'c2', date: '14–21 Ago 2026', reason: 'Vacaciones de verano', all: true },
  { id: 'c3', date: '24 Dic 2026', reason: 'Nochebuena', all: false, closingTime: '15:00', barberIds: ['b1'] },
]

export const MOCK_TAKEN_SLOTS: string[] = ['11:00', '11:30', '13:00', '15:30', '18:00', '19:30']
