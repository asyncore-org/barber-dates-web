export interface LoyaltyCard {
  id: string
  clientId: string
  points: number
  stamps: number
  memberCode: string
  createdAt: string
}

export interface Reward {
  id: string
  label: string
  cost: number
  isActive: boolean
  sortOrder: number
}

export interface ILoyaltyRepository {
  getCardForClient(clientId: string): Promise<LoyaltyCard | null>
  getActiveRewards(): Promise<Reward[]>
  getRedeemedRewardIds(clientId: string): Promise<string[]>
  redeemReward(clientId: string, rewardId: string): Promise<void>
}
