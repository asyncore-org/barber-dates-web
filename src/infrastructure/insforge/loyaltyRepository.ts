import type { ILoyaltyRepository, LoyaltyCard, Reward, CreateRewardData, UpdateRewardData } from '@/domain/loyalty'
import { insforgeClient } from './client'

interface LoyaltyCardRow {
  id: string
  client_id: string
  total_points: number
  total_visits: number
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

interface TransactionRow {
  id: string
  points: number
}

interface ServicePointsRow {
  loyalty_points: number
}

const CARD_SELECT = 'id, client_id, total_points, total_visits, created_at'
const REWARD_SELECT = 'id, label, cost, is_active, sort_order'

function mapToLoyaltyCard(row: LoyaltyCardRow): LoyaltyCard {
  return {
    id: row.id,
    clientId: row.client_id,
    points: row.total_points,
    totalVisits: row.total_visits,
    memberCode: row.id.slice(0, 8).toUpperCase(),
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

interface CardMeta { id: string; total_points: number; total_visits: number }

async function getCardByClientId(clientId: string): Promise<CardMeta | null> {
  const { data, error } = await insforgeClient.database
    .from('loyalty_cards')
    .select('id, total_points, total_visits')
    .eq('client_id', clientId)
    .maybeSingle()
  if (error) throw error
  return data as CardMeta | null
}

export class InsForgeLoyaltyRepository implements ILoyaltyRepository {
  async getCardForClient(clientId: string): Promise<LoyaltyCard | null> {
    const { data, error } = await insforgeClient.database
      .from('loyalty_cards')
      .select(CARD_SELECT)
      .eq('client_id', clientId)
      .maybeSingle()
    if (error) throw error
    return data ? mapToLoyaltyCard(data as LoyaltyCardRow) : null
  }

  async getActiveRewards(): Promise<Reward[]> {
    const { data, error } = await insforgeClient.database
      .from('rewards')
      .select(REWARD_SELECT)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    if (error) throw error
    return ((data ?? []) as RewardRow[]).map(mapToReward)
  }

  async getAllRewards(): Promise<Reward[]> {
    const { data, error } = await insforgeClient.database
      .from('rewards')
      .select(REWARD_SELECT)
      .order('sort_order', { ascending: true })
    if (error) throw error
    return ((data ?? []) as RewardRow[]).map(mapToReward)
  }

  async getRedeemedRewardIds(clientId: string): Promise<string[]> {
    const card = await getCardByClientId(clientId)
    if (!card) return []

    const { data, error } = await insforgeClient.database
      .from('redeemed_rewards')
      .select('reward_id')
      .eq('card_id', card.id)
    if (error) throw error
    return ((data ?? []) as RedeemedRewardRow[]).map(r => r.reward_id)
  }

  async redeemReward(clientId: string, rewardId: string): Promise<void> {
    // Get authoritative cost from DB — never trust a client-supplied value
    const { data: rewardRow, error: rewardErr } = await insforgeClient.database
      .from('rewards')
      .select('cost, is_active')
      .eq('id', rewardId)
      .maybeSingle()
    if (rewardErr) throw rewardErr
    if (!rewardRow) throw new Error('Reward not found')
    const { cost, is_active } = rewardRow as { cost: number; is_active: boolean }
    if (!is_active) throw new Error('Reward is not active')

    const card = await getCardByClientId(clientId)
    if (!card) throw new Error('No loyalty card found for client')
    if (card.total_points < cost) throw new Error('Insufficient points')

    // Insert redeemed_rewards FIRST: unique constraint blocks duplicate redemptions
    // (one_time mode) before any points are deducted — safest ordering without a transaction.
    const { error: rrErr } = await insforgeClient.database
      .from('redeemed_rewards')
      .insert({ card_id: card.id, reward_id: rewardId })
    if (rrErr) throw rrErr

    const newPoints = card.total_points - cost

    const { error: updateErr } = await insforgeClient.database
      .from('loyalty_cards')
      .update({ total_points: newPoints })
      .eq('id', card.id)
    if (updateErr) throw updateErr

    const { error: txErr } = await insforgeClient.database
      .from('loyalty_transactions')
      .insert({ card_id: card.id, points: -cost, type: 'redeemed', description: 'Premio canjeado' })
    if (txErr) throw txErr
  }

  async awardPointsForAppointment(appointmentId: string, clientId: string, serviceId: string): Promise<void> {
    const card = await getCardByClientId(clientId)
    if (!card) return

    // Idempotency check: skip if already awarded for this appointment
    const { data: existing } = await insforgeClient.database
      .from('loyalty_transactions')
      .select('id')
      .eq('card_id', card.id)
      .eq('appointment_id', appointmentId)
      .eq('type', 'earned')
      .maybeSingle()
    if (existing) return

    const { data: svc, error: svcErr } = await insforgeClient.database
      .from('services')
      .select('loyalty_points')
      .eq('id', serviceId)
      .maybeSingle()
    if (svcErr) throw svcErr
    const points = (svc as ServicePointsRow | null)?.loyalty_points ?? 0
    if (points === 0) return

    const { error: updateErr } = await insforgeClient.database
      .from('loyalty_cards')
      .update({ total_points: card.total_points + points, total_visits: card.total_visits + 1 })
      .eq('id', card.id)
    if (updateErr) throw updateErr

    const { error: txErr } = await insforgeClient.database
      .from('loyalty_transactions')
      .insert({ card_id: card.id, appointment_id: appointmentId, points, type: 'earned', description: 'Puntos por cita completada' })
    if (txErr) throw txErr
  }

  async deductPointsForAppointment(appointmentId: string, clientId: string): Promise<void> {
    const card = await getCardByClientId(clientId)
    if (!card) return

    // Idempotency: skip if an adjustment for this appointment already exists
    const { data: existingAdj } = await insforgeClient.database
      .from('loyalty_transactions')
      .select('id')
      .eq('card_id', card.id)
      .eq('appointment_id', appointmentId)
      .eq('type', 'adjustment')
      .maybeSingle()
    if (existingAdj) return

    const { data: tx } = await insforgeClient.database
      .from('loyalty_transactions')
      .select('id, points')
      .eq('card_id', card.id)
      .eq('appointment_id', appointmentId)
      .eq('type', 'earned')
      .maybeSingle()
    if (!tx) return

    const earnedPoints = (tx as TransactionRow).points
    const newPoints = Math.max(0, card.total_points - earnedPoints)

    // Insert adjustment FIRST: acts as idempotency gate — if card update fails,
    // the next retry finds this row and returns early instead of deducting twice.
    const { error: txErr } = await insforgeClient.database
      .from('loyalty_transactions')
      .insert({ card_id: card.id, appointment_id: appointmentId, points: -earnedPoints, type: 'adjustment', description: 'Descuento por no-show' })
    if (txErr) throw txErr

    const { error: updateErr } = await insforgeClient.database
      .from('loyalty_cards')
      .update({ total_points: newPoints, total_visits: Math.max(0, card.total_visits - 1) })
      .eq('id', card.id)
    if (updateErr) throw updateErr
  }

  async getLoyaltyCardsForClients(clientIds: string[]): Promise<Map<string, LoyaltyCard>> {
    if (clientIds.length === 0) return new Map()

    const { data, error } = await insforgeClient.database
      .from('loyalty_cards')
      .select(CARD_SELECT)
      .in('client_id', clientIds)
    if (error) throw error

    const result = new Map<string, LoyaltyCard>()
    for (const row of (data ?? []) as LoyaltyCardRow[]) {
      result.set(row.client_id, mapToLoyaltyCard(row))
    }
    return result
  }

  async createReward(data: CreateRewardData): Promise<Reward> {
    const { data: row, error } = await insforgeClient.database
      .from('rewards')
      .insert({ label: data.label, cost: data.cost, sort_order: data.sortOrder ?? 99, is_active: true })
      .select(REWARD_SELECT)
      .single()
    if (error) throw error
    return mapToReward(row as RewardRow)
  }

  async updateReward(id: string, data: UpdateRewardData): Promise<Reward> {
    const patch: Record<string, unknown> = {}
    if (data.label !== undefined) patch.label = data.label
    if (data.cost !== undefined) patch.cost = data.cost
    if (data.isActive !== undefined) patch.is_active = data.isActive
    if (data.sortOrder !== undefined) patch.sort_order = data.sortOrder

    const { data: row, error } = await insforgeClient.database
      .from('rewards')
      .update(patch)
      .eq('id', id)
      .select(REWARD_SELECT)
      .single()
    if (error) throw error
    return mapToReward(row as RewardRow)
  }

  async deleteReward(id: string): Promise<void> {
    const { error } = await insforgeClient.database
      .from('rewards')
      .update({ is_active: false })
      .eq('id', id)
    if (error) throw error
  }
}
