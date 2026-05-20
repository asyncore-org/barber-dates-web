export interface LoyaltyCard {
  id: string
  clientId: string
  points: number
  totalVisits: number
  memberCode?: string
  createdAt: string
  completedCycles?: number
}

export interface Reward {
  id: string
  label: string
  cost: number
  isActive: boolean
  sortOrder: number
}

export interface CreateRewardData {
  label: string
  cost: number
  sortOrder?: number
}

export interface UpdateRewardData {
  label?: string
  cost?: number
  isActive?: boolean
  sortOrder?: number
}

export type LoyaltyPointsStatus = 'none' | 'awarded' | 'revoked'

export interface LoyaltyTransaction {
  id: string
  points: number
  type: 'earned' | 'redeemed' | 'adjustment' | 'manual'
  description: string
  createdAt: string
  appointmentId?: string
}

export interface ILoyaltyRepository {
  getCardForClient(clientId: string): Promise<LoyaltyCard | null>
  getActiveRewards(): Promise<Reward[]>
  getAllRewards(): Promise<Reward[]>
  getRedeemedRewardIds(clientId: string): Promise<string[]>
  redeemReward(clientId: string, rewardId: string): Promise<void>
  createReward(data: CreateRewardData): Promise<Reward>
  updateReward(id: string, data: UpdateRewardData): Promise<Reward>
  deleteReward(id: string): Promise<void>
  /** Idempotent: skips if points already awarded for this appointment. */
  awardPointsForAppointment(appointmentId: string, clientId: string, serviceId: string): Promise<void>
  /** Deducts points earned for an appointment (no-show cancel). No-op if no earned transaction exists. */
  deductPointsForAppointment(appointmentId: string, clientId: string): Promise<void>
  /** Bulk fetch loyalty cards for a set of client IDs. */
  getLoyaltyCardsForClients(clientIds: string[]): Promise<Map<string, LoyaltyCard>>
  /** Returns whether points have been awarded or revoked for a specific appointment. */
  getLoyaltyStatusForAppointment(appointmentId: string, clientId: string): Promise<LoyaltyPointsStatus>
  /** Undoes a previous revocation (adjustment) — restores the earned points. */
  undoRevokePoints(appointmentId: string, clientId: string): Promise<void>
  /** Undoes a previous award — removes earned points as if never granted. */
  undoAwardPoints(appointmentId: string, clientId: string): Promise<void>
  /** Admin manual adjustment: positive = add, negative = deduct. */
  manualAdjustPoints(clientId: string, points: number, description: string): Promise<void>
  /**
   * Admin explicit award for a specific appointment — creates an 'earned' transaction
   * regardless of service loyalty_points config. Creates loyalty card if missing.
   */
  adminAwardForAppointment(appointmentId: string, clientId: string, points: number): Promise<void>
  /** Recent transactions for a client card. */
  getRecentTransactions(clientId: string, limit?: number): Promise<LoyaltyTransaction[]>
  /** Returns service loyalty_points or null if service doesn't exist. */
  getServiceLoyaltyPoints(serviceId: string): Promise<number | null>
}
