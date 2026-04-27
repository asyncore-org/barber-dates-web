import type { ILoyaltyRepository, LoyaltyCard, Reward } from '@/domain/loyalty'
import { insforgeClient } from './client'

interface LoyaltyCardRow {
  id: string
  client_id: string
  points: number
  stamps: number
  member_code: string
  created_at: string
}

interface RewardRow {
  id: string
  label: string
  cost: number
  is_active: boolean
  sort_order: number
}

interface RedeemedRewardRow {
  reward_id: string
}

function mapToLoyaltyCard(row: LoyaltyCardRow): LoyaltyCard {
  return {
    id: row.id,
    clientId: row.client_id,
    points: row.points,
    stamps: row.stamps,
    memberCode: row.member_code,
    createdAt: row.created_at,
  }
}

function mapToReward(row: RewardRow): Reward {
  return {
    id: row.id,
    label: row.label,
    cost: Number(row.cost),
    isActive: row.is_active,
    sortOrder: row.sort_order,
  }
}

export class InsForgeLoyaltyRepository implements ILoyaltyRepository {
  async getCardForClient(clientId: string): Promise<LoyaltyCard | null> {
    const { data, error } = await insforgeClient.database
      .from('loyalty_cards')
      .select('id, client_id, points, stamps, member_code, created_at')
      .eq('client_id', clientId)
      .maybeSingle()
    if (error) throw error
    return data ? mapToLoyaltyCard(data as LoyaltyCardRow) : null
  }

  async getActiveRewards(): Promise<Reward[]> {
    const { data, error } = await insforgeClient.database
      .from('rewards')
      .select('id, label, cost, is_active, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    if (error) throw error
    return ((data ?? []) as RewardRow[]).map(mapToReward)
  }

  async getRedeemedRewardIds(clientId: string): Promise<string[]> {
    const { data, error } = await insforgeClient.database
      .from('redeemed_rewards')
      .select('reward_id')
      .eq('client_id', clientId)
    if (error) throw error
    return ((data ?? []) as RedeemedRewardRow[]).map(r => r.reward_id)
  }

  async redeemReward(clientId: string, rewardId: string): Promise<void> {
    const { error } = await insforgeClient.database
      .from('redeemed_rewards')
      .insert({ client_id: clientId, reward_id: rewardId, redeemed_at: new Date().toISOString() })
    if (error) throw error
  }
}
