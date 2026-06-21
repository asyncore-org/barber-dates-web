import { useMemo } from 'react'
import {
  useLoyaltyCard, useRewards, useRedeemedRewardIds,
  useRedeemReward, useRedeemTierConfigReward,
} from '@/hooks/useLoyalty'
import { useLoyaltyConfig } from '@/hooks/useShopConfig'

interface Props {
  clientId: string
}

export function AppointmentClientRewards({ clientId }: Props) {
  const { data: card }           = useLoyaltyCard(clientId)
  const { data: dbRewards = [] } = useRewards()
  const { data: redeemedIds = [] } = useRedeemedRewardIds(clientId)
  const { data: loyaltyConfig }  = useLoyaltyConfig()
  const redeemSimple             = useRedeemReward()
  const redeemTier               = useRedeemTierConfigReward()

  const points = card?.points ?? 0

  const available = useMemo(() => {
    if (!card) return []
    if (loyaltyConfig?.mode === 'tiers' && (loyaltyConfig.tiers?.length ?? 0) > 0) {
      const sorted = [...loyaltyConfig.tiers].sort((a, b) => a.minPoints - b.minPoints)
      return sorted
        .filter(t => points >= t.minPoints)
        .flatMap(t =>
          t.rewards.map(r => ({
            id: r.id, label: r.label, cost: r.cost,
            isTier: true,
            isPermanent: r.isPermanent ?? false,
            redeemed: !(r.isPermanent ?? false) && redeemedIds.includes(r.id),
            canRedeem: (r.isPermanent ?? false)
              ? points >= r.cost
              : points >= r.cost && !redeemedIds.includes(r.id),
          }))
        )
    }
    return dbRewards.filter(r => r.isActive).map(r => ({
      id: r.id, label: r.label, cost: r.cost,
      isTier: false, isPermanent: false,
      redeemed: redeemedIds.includes(r.id),
      canRedeem: points >= r.cost && !redeemedIds.includes(r.id),
    }))
  }, [card, loyaltyConfig, dbRewards, redeemedIds, points])

  if (!card || available.length === 0) return null

  const isPending = redeemSimple.isPending || redeemTier.isPending

  const handleRedeem = (r: typeof available[0]) => {
    if (r.isTier) {
      redeemTier.mutate({ clientId, rewardId: r.id, cost: r.cost, label: r.label })
    } else {
      redeemSimple.mutate({ clientId, rewardId: r.id })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontFamily: 'var(--font-ui)', letterSpacing: '0.14em', color: 'var(--fg-4)', textTransform: 'uppercase' }}>
          Recompensas del cliente
        </span>
        <span style={{ fontSize: 10, fontFamily: 'var(--font-ui)', color: 'var(--gold)', fontWeight: 600 }}>
          {points} pts
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {available.map(r => (
          <div key={r.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '0.35rem 0.625rem', borderRadius: 8,
            background: r.redeemed ? 'rgba(255,255,255,0.03)' : r.canRedeem ? 'rgba(201,162,74,0.07)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${r.redeemed ? 'rgba(255,255,255,0.06)' : r.canRedeem ? 'rgba(201,162,74,0.25)' : 'rgba(255,255,255,0.07)'}`,
          }}>
            <span style={{
              flex: 1, fontFamily: 'var(--font-ui)', fontSize: 12,
              color: r.redeemed ? 'var(--fg-4)' : 'var(--fg-0)',
              textDecoration: r.redeemed ? 'line-through' : 'none',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{r.label}</span>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-ui)', color: 'var(--gold)', flexShrink: 0 }}>
              {r.cost} pts
            </span>
            {r.redeemed ? (
              <span style={{ fontSize: 9, fontFamily: 'var(--font-ui)', color: 'var(--fg-4)', padding: '2px 7px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                Canjeado
              </span>
            ) : (
              <button
                disabled={!r.canRedeem || isPending}
                onClick={() => handleRedeem(r)}
                style={{
                  padding: '3px 10px', borderRadius: 6, flexShrink: 0,
                  border: `1px solid ${r.canRedeem ? 'rgba(201,162,74,0.45)' : 'rgba(255,255,255,0.08)'}`,
                  background: r.canRedeem ? 'rgba(201,162,74,0.12)' : 'transparent',
                  color: r.canRedeem ? 'var(--gold)' : 'var(--fg-4)',
                  fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
                  letterSpacing: '0.1em', cursor: r.canRedeem && !isPending ? 'pointer' : 'default',
                  opacity: isPending ? 0.6 : 1,
                }}
              >
                CANJEAR
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
