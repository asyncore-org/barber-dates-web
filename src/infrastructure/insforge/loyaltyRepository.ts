import type {
  ILoyaltyRepository,
  LoyaltyCard,
  LoyaltyPointsStatus,
  LoyaltyTransaction,
  Reward,
  CreateRewardData,
  UpdateRewardData,
} from '@/domain/loyalty'
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
  type: string
  description: string
  created_at: string
  appointment_id?: string
}

interface ServicePointsRow {
  loyalty_points: number
}

const CARD_SELECT = 'id, client_id, total_points, total_visits, created_at'
const REWARD_SELECT = 'id, label, cost, is_active, sort_order'

function generateMemberCode(uuid: string): string {
  const hex = uuid.replace(/-/g, '').slice(0, 12)
  const num = BigInt('0x' + hex)
  return num.toString(36).toUpperCase().padStart(9, '0').slice(-9)
}

function mapToLoyaltyCard(row: LoyaltyCardRow): LoyaltyCard {
  return {
    id: row.id,
    clientId: row.client_id,
    points: row.total_points,
    totalVisits: row.total_visits,
    memberCode: generateMemberCode(row.id),
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

function mapToTransaction(row: TransactionRow): LoyaltyTransaction {
  return {
    id: row.id,
    points: row.points,
    type: row.type as LoyaltyTransaction['type'],
    description: row.description,
    createdAt: row.created_at,
    appointmentId: row.appointment_id,
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

async function getCompletedCycles(cardId: string): Promise<number> {
  const { data, error } = await insforgeClient.database
    .from('loyalty_transactions')
    .select('id')
    .eq('card_id', cardId)
    .eq('type', 'manual')
    .eq('description', '__cycle_complete__')
  if (error) throw error
  return (data ?? []).length
}

export class InsForgeLoyaltyRepository implements ILoyaltyRepository {
  async getCardForClient(clientId: string): Promise<LoyaltyCard | null> {
    const { data, error } = await insforgeClient.database
      .from('loyalty_cards')
      .select(CARD_SELECT)
      .eq('client_id', clientId)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    const row = data as LoyaltyCardRow
    const completedCycles = await getCompletedCycles(row.id)
    return { ...mapToLoyaltyCard(row), completedCycles }
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

    const [{ data: activeRewards }, { data: redeemed, error }] = await Promise.all([
      insforgeClient.database.from('rewards').select('id').eq('is_active', true),
      insforgeClient.database.from('redeemed_rewards').select('reward_id').eq('card_id', card.id),
    ])
    if (error) throw error

    const rows = (redeemed ?? []) as RedeemedRewardRow[]
    const totalActive = (activeRewards ?? []).length

    // Auto-reset: if all rewards have been redeemed, clear so client can redeem again
    if (totalActive > 0 && rows.length >= totalActive) {
      await insforgeClient.database.from('redeemed_rewards').delete().eq('card_id', card.id)
      await insforgeClient.database
        .from('loyalty_transactions')
        .insert({ card_id: card.id, points: 0, type: 'manual', description: '__cycle_complete__' })
      return []
    }

    return rows.map(r => r.reward_id)
  }

  async redeemReward(clientId: string, rewardId: string): Promise<void> {
    const { data: rewardRow, error: rewardErr } = await insforgeClient.database
      .from('rewards')
      .select('cost, is_active, label')
      .eq('id', rewardId)
      .maybeSingle()
    if (rewardErr) throw rewardErr
    if (!rewardRow) throw new Error('Reward not found')
    const { cost, is_active, label } = rewardRow as { cost: number; is_active: boolean; label: string }
    if (!is_active) throw new Error('Reward is not active')

    const card = await getCardByClientId(clientId)
    if (!card) throw new Error('No loyalty card found for client')
    const cycles = await getCompletedCycles(card.id)
    const adjustedCost = cost * Math.pow(2, cycles)
    if (card.total_points < adjustedCost) throw new Error('Insufficient points')

    // Progressive: mark as redeemed but DO NOT deduct points
    const { error: rrErr } = await insforgeClient.database
      .from('redeemed_rewards')
      .insert({ card_id: card.id, reward_id: rewardId })
    if (rrErr) throw rrErr

    const { error: txErr } = await insforgeClient.database
      .from('loyalty_transactions')
      .insert({ card_id: card.id, points: 0, type: 'redeemed', description: `Premio canjeado: ${label}` })
    if (txErr) throw txErr

    // Auto-reset: if this was the last available reward, clear redeemed list immediately
    const [{ data: activeRewards }, { data: nowRedeemed }] = await Promise.all([
      insforgeClient.database.from('rewards').select('id').eq('is_active', true),
      insforgeClient.database.from('redeemed_rewards').select('reward_id').eq('card_id', card.id),
    ])
    const totalActive = (activeRewards ?? []).length
    const totalRedeemed = (nowRedeemed ?? []).length
    if (totalActive > 0 && totalRedeemed >= totalActive) {
      await insforgeClient.database.from('redeemed_rewards').delete().eq('card_id', card.id)
      await insforgeClient.database
        .from('loyalty_transactions')
        .insert({ card_id: card.id, points: 0, type: 'manual', description: '__cycle_complete__' })
    }
  }

  async awardPointsForAppointment(appointmentId: string, clientId: string, serviceId: string): Promise<void> {
    const card = await getCardByClientId(clientId)
    if (!card) return

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

    const { data: earned } = await insforgeClient.database
      .from('loyalty_transactions')
      .select('id, points')
      .eq('card_id', card.id)
      .eq('appointment_id', appointmentId)
      .eq('type', 'earned')
      .maybeSingle()
    if (!earned) return

    const earnedPoints = (earned as TransactionRow).points
    const newPoints = Math.max(0, card.total_points - earnedPoints)

    // Delete the earned transaction so history stays clean
    const { error: delErr } = await insforgeClient.database
      .from('loyalty_transactions')
      .delete()
      .eq('id', (earned as TransactionRow).id)
    if (delErr) throw delErr

    // Also remove any legacy adjustment tx for this appointment
    await insforgeClient.database
      .from('loyalty_transactions')
      .delete()
      .eq('card_id', card.id)
      .eq('appointment_id', appointmentId)
      .eq('type', 'adjustment')

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

  async getLoyaltyStatusForAppointment(appointmentId: string, clientId: string): Promise<LoyaltyPointsStatus> {
    const card = await getCardByClientId(clientId)
    if (!card) return 'none'

    const { data: earned } = await insforgeClient.database
      .from('loyalty_transactions')
      .select('id')
      .eq('card_id', card.id)
      .eq('appointment_id', appointmentId)
      .eq('type', 'earned')
      .maybeSingle()

    if (!earned) return 'none'

    const { data: adj } = await insforgeClient.database
      .from('loyalty_transactions')
      .select('id')
      .eq('card_id', card.id)
      .eq('appointment_id', appointmentId)
      .eq('type', 'adjustment')
      .maybeSingle()

    return adj ? 'revoked' : 'awarded'
  }

  async undoRevokePoints(appointmentId: string, clientId: string): Promise<void> {
    const card = await getCardByClientId(clientId)
    if (!card) return

    // Find the adjustment transaction to remove
    const { data: adj } = await insforgeClient.database
      .from('loyalty_transactions')
      .select('id, points')
      .eq('card_id', card.id)
      .eq('appointment_id', appointmentId)
      .eq('type', 'adjustment')
      .maybeSingle()
    if (!adj) return

    const deductedPoints = Math.abs((adj as TransactionRow).points)
    const newPoints = card.total_points + deductedPoints

    const { error: delErr } = await insforgeClient.database
      .from('loyalty_transactions')
      .delete()
      .eq('id', (adj as TransactionRow).id)
    if (delErr) throw delErr

    const { error: updateErr } = await insforgeClient.database
      .from('loyalty_cards')
      .update({ total_points: newPoints, total_visits: card.total_visits + 1 })
      .eq('id', card.id)
    if (updateErr) throw updateErr
  }

  async undoAwardPoints(appointmentId: string, clientId: string): Promise<void> {
    const card = await getCardByClientId(clientId)
    if (!card) return

    // Must not have an adjustment already (would mean it's already revoked)
    const { data: adj } = await insforgeClient.database
      .from('loyalty_transactions')
      .select('id')
      .eq('card_id', card.id)
      .eq('appointment_id', appointmentId)
      .eq('type', 'adjustment')
      .maybeSingle()
    if (adj) return // already revoked, use undoRevoke instead

    const { data: earned } = await insforgeClient.database
      .from('loyalty_transactions')
      .select('id, points')
      .eq('card_id', card.id)
      .eq('appointment_id', appointmentId)
      .eq('type', 'earned')
      .maybeSingle()
    if (!earned) return

    const earnedPoints = (earned as TransactionRow).points
    const newPoints = Math.max(0, card.total_points - earnedPoints)

    const { error: delErr } = await insforgeClient.database
      .from('loyalty_transactions')
      .delete()
      .eq('id', (earned as TransactionRow).id)
    if (delErr) throw delErr

    const { error: updateErr } = await insforgeClient.database
      .from('loyalty_cards')
      .update({ total_points: newPoints, total_visits: Math.max(0, card.total_visits - 1) })
      .eq('id', card.id)
    if (updateErr) throw updateErr
  }

  async manualAdjustPoints(clientId: string, points: number, description: string): Promise<void> {
    const card = await getCardByClientId(clientId)
    if (!card) throw new Error('No loyalty card found for client')

    const newPoints = Math.max(0, card.total_points + points)
    const newVisits = points > 0 ? card.total_visits + 1 : card.total_visits

    const { error: updateErr } = await insforgeClient.database
      .from('loyalty_cards')
      .update({ total_points: newPoints, total_visits: newVisits })
      .eq('id', card.id)
    if (updateErr) throw updateErr

    const { error: txErr } = await insforgeClient.database
      .from('loyalty_transactions')
      .insert({ card_id: card.id, points, type: 'manual', description })
    if (txErr) throw txErr
  }

  async adminAwardForAppointment(appointmentId: string, clientId: string, points: number): Promise<void> {
    let card = await getCardByClientId(clientId)

    // Auto-create loyalty card if client doesn't have one yet
    if (!card) {
      const { data: newCard, error: createErr } = await insforgeClient.database
        .from('loyalty_cards')
        .insert({ client_id: clientId, total_points: 0, total_visits: 0 })
        .select('id, total_points, total_visits')
        .single()
      if (createErr) throw createErr
      card = newCard as CardMeta
    }

    // Idempotency: check if already awarded for this appointment
    const { data: existing } = await insforgeClient.database
      .from('loyalty_transactions')
      .select('id')
      .eq('card_id', card.id)
      .eq('appointment_id', appointmentId)
      .eq('type', 'earned')
      .maybeSingle()
    if (existing) return

    const { error: updateErr } = await insforgeClient.database
      .from('loyalty_cards')
      .update({ total_points: card.total_points + points, total_visits: card.total_visits + 1 })
      .eq('id', card.id)
    if (updateErr) throw updateErr

    const { error: txErr } = await insforgeClient.database
      .from('loyalty_transactions')
      .insert({
        card_id: card.id,
        appointment_id: appointmentId,
        points,
        type: 'earned',
        description: `Puntos otorgados por admin (${points} pts)`,
      })
    if (txErr) throw txErr
  }

  async getServiceLoyaltyPoints(serviceId: string): Promise<number | null> {
    const { data, error } = await insforgeClient.database
      .from('services')
      .select('loyalty_points')
      .eq('id', serviceId)
      .maybeSingle()
    if (error) throw error
    return (data as ServicePointsRow | null)?.loyalty_points ?? null
  }

  async getRecentTransactions(clientId: string, limit = 10): Promise<LoyaltyTransaction[]> {
    const card = await getCardByClientId(clientId)
    if (!card) return []

    const { data, error } = await insforgeClient.database
      .from('loyalty_transactions')
      .select('id, points, type, description, created_at, appointment_id')
      .eq('card_id', card.id)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return ((data ?? []) as TransactionRow[]).map(mapToTransaction)
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
