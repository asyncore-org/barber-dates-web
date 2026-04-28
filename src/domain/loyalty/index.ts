export interface LoyaltyCard {
  id: string
  clientId: string
  points: number
  totalVisits: number
  memberCode?: string
  createdAt: string
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

export interface ILoyaltyRepository {
  getCardForClient(clientId: string): Promise<LoyaltyCard | null>
  getActiveRewards(): Promise<Reward[]>
  getAllRewards(): Promise<Reward[]>
  getRedeemedRewardIds(clientId: string): Promise<string[]>
  redeemReward(clientId: string, rewardId: string): Promise<void>
  createReward(data: CreateRewardData): Promise<Reward>
  updateReward(id: string, data: UpdateRewardData): Promise<Reward>
  deleteReward(id: string): Promise<void>
}
