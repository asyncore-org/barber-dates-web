// Query key factory for TanStack Query.
// Each entity defines its own staleTime — see QueryClient config in main.tsx.
//
// staleTime guidance by entity:
//   services / barbers / shop config   → 10 min  (rarely change)
//   appointments list                  → 2 min   (moderate churn)
//   available slots for a date         → 30 s    (high churn during booking)
//   loyalty data                       → 5 min   (only changes after an appointment)

export const queryKeys = {
  shop: {
    all:     () => ['shop'] as const,
    info:    () => ['shop', 'info'] as const,
    booking: () => ['shop', 'booking'] as const,
    loyalty: () => ['shop', 'loyalty'] as const,
    /** @deprecated use shop.info / shop.booking instead */
    config:  () => ['shop', 'config'] as const,
  },

  services: {
    all:  () => ['services'] as const,
    list: () => ['services', 'list'] as const,
  },

  barbers: {
    all:  () => ['barbers'] as const,
    list: () => ['barbers', 'list'] as const,
    byId: (id: string) => ['barbers', id] as const,
  },

  schedule: {
    all:     () => ['schedule'] as const,
    weekly:  () => ['schedule', 'weekly'] as const,
    blocks:  () => ['schedule', 'blocks'] as const,
  },

  appointments: {
    all:    () => ['appointments'] as const,
    list:   (userId: string) => ['appointments', 'list', userId] as const,
    byId:   (id: string) => ['appointments', id] as const,
  },

  slots: {
    all:           () => ['slots'] as const,
    byDate:        (date: string) => ['slots', date] as const,
    byDateBarber:  (date: string, barberId: string) => ['slots', date, barberId] as const,
  },

  loyalty: {
    all:      () => ['loyalty'] as const,
    byUser:   (userId: string) => ['loyalty', userId] as const,
    redeemed: (userId: string) => ['loyalty', userId, 'redeemed'] as const,
  },

  rewards: {
    all:    () => ['rewards'] as const,
    active: () => ['rewards', 'active'] as const,
  },
} as const

// staleTime constants (ms) — used when creating individual useQuery hooks
export const STALE = {
  LONG: 10 * 60 * 1000,    // 10 min — shop config, services, barbers
  MEDIUM: 2 * 60 * 1000,   // 2 min  — appointments
  SHORT: 30_000,            // 30 s   — available slots
  LOYALTY: 5 * 60 * 1000,  // 5 min  — loyalty data
} as const
