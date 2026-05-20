import { useMemo, useState } from 'react'
import { useLoyaltyCard, useRewards, useRedeemedRewardIds, useManualAdjustPoints, useRecentTransactions } from '@/hooks/useLoyalty'
import { useLoyaltyConfig } from '@/hooks/useShopConfig'
import { useClientProfile } from '@/hooks/useProfile'
import { useClientAppointments } from '@/hooks/useAppointments'
import { useAllServices } from '@/hooks/useServices'
import { LoyaltyCard } from '@/components/loyalty'

interface Props {
  clientId: string
  clientName: string
  onClose: () => void
  hideMoney?: boolean
}

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No vino',
}

const STATUS_COLOR: Record<string, string> = {
  confirmed: 'var(--led)',
  completed: 'var(--ok)',
  cancelled: 'var(--fg-3)',
  no_show: 'var(--brick-warm)',
}

const TX_TYPE_LABEL: Record<string, string> = {
  earned: '+pts',
  redeemed: 'Canje',
  adjustment: 'Ajuste',
  manual: 'Manual',
}

const TX_TYPE_COLOR: Record<string, string> = {
  earned: 'var(--ok)',
  redeemed: 'var(--gold)',
  adjustment: 'var(--brick-warm)',
  manual: 'var(--led)',
}

function calcInitials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?'
}

const QUICK_AMOUNTS = [10, 25, 50, 100]

export function ClientProfileModal({ clientId, clientName, onClose, hideMoney = false }: Props) {
  const { data: profile } = useClientProfile(clientId)
  const { data: loyaltyCard } = useLoyaltyCard(clientId)
  const { data: loyaltyConfig } = useLoyaltyConfig()
  const { data: rewards = [] } = useRewards()
  const { data: redeemedIds = [] } = useRedeemedRewardIds(clientId)
  const { data: appointments = [] } = useClientAppointments(clientId)
  const { data: services = [] } = useAllServices()
  const { data: transactions = [] } = useRecentTransactions(clientId, 8)
  const manualAdjust = useManualAdjustPoints()

  const [adjustMode, setAdjustMode] = useState<'add' | 'deduct' | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [adjustNote, setAdjustNote] = useState('')

  const currentYear = new Date().getFullYear()
  const nowMs = new Date().getTime()

  const stats = useMemo(() => {
    const past = appointments.filter(a =>
      (a.status === 'confirmed' || a.status === 'completed') && new Date(a.endTime).getTime() < nowMs,
    )
    const yearVisits = past.filter(a => new Date(a.startTime).getFullYear() === currentYear).length
    const totalSpent = past.reduce((sum, a) => {
      const svc = services.find(s => s.id === a.serviceId)
      return sum + (svc?.price ?? 0)
    }, 0)
    return { yearVisits, totalSpent }
  }, [appointments, services, currentYear, nowMs])

  const recentAppts = useMemo(
    () => [...appointments].sort((a, b) => b.startTime.localeCompare(a.startTime)).slice(0, 5),
    [appointments],
  )

  const memberSince = loyaltyCard?.createdAt
    ? new Date(loyaltyCard.createdAt).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
    : null

  const handleAdjust = (amount: number) => {
    const pts = adjustMode === 'deduct' ? -Math.abs(amount) : Math.abs(amount)
    const note = adjustNote.trim() || (adjustMode === 'add' ? 'Ajuste manual — suma' : 'Ajuste manual — descuento')
    manualAdjust.mutate(
      { clientId, points: pts, description: note },
      {
        onSuccess: () => {
          setAdjustMode(null)
          setCustomAmount('')
          setAdjustNote('')
        },
      },
    )
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 14,
          width: '100%', maxWidth: 440, maxHeight: '90dvh',
          overflowY: 'auto', boxShadow: 'var(--shadow-lg)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'var(--led)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 16, color: '#fff', flexShrink: 0,
          }}>
            {calcInitials(clientName)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 600, color: 'var(--fg-0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {clientName}
            </div>
            {profile?.phone && (
              <div style={{ fontSize: 12, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)' }}>{profile.phone}</div>
            )}
            {memberSince && (
              <div style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', marginTop: 1 }}>
                Miembro desde {memberSince}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-2)', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Loyalty card */}
          {loyaltyCard && (
            <LoyaltyCard
              compact
              points={loyaltyCard.points}
              target={loyaltyConfig?.stampGoal ?? 10}
              stamps={loyaltyCard.totalVisits}
              memberCode={loyaltyCard.memberCode ?? '—'}
              createdAt={loyaltyCard.createdAt}
              completedCycles={loyaltyCard.completedCycles}
              rewards={rewards.filter(r => r.isActive).map(r => ({
                id: r.id,
                label: r.label,
                cost: r.cost,
                redeemed: redeemedIds.includes(r.id),
                canRedeem: loyaltyCard.points >= r.cost * Math.pow(2, loyaltyCard.completedCycles ?? 0) && !redeemedIds.includes(r.id),
              }))}
            />
          )}

          {/* Manual points adjustment */}
          {loyaltyCard && (
            <div style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 10, padding: '1rem' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.12em', color: 'var(--fg-3)', marginBottom: '0.75rem' }}>
                AJUSTE DE PUNTOS
              </div>

              {!adjustMode ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setAdjustMode('add')}
                    style={{ flex: 1, padding: '0.625rem', minHeight: 36, borderRadius: 7, border: 'none', background: 'var(--ok)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    + Añadir puntos
                  </button>
                  <button
                    onClick={() => setAdjustMode('deduct')}
                    style={{ flex: 1, padding: '0.625rem', minHeight: 36, borderRadius: 7, border: '1px solid var(--brick-warm)', background: 'rgba(139,58,31,0.1)', color: 'var(--brick-warm)', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    − Descontar puntos
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12, fontFamily: 'var(--font-ui)', color: adjustMode === 'add' ? 'var(--ok)' : 'var(--brick-warm)', fontWeight: 600, marginBottom: 2 }}>
                    {adjustMode === 'add' ? '+ Añadir puntos' : '− Descontar puntos'}
                  </div>
                  {/* Quick amounts */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {QUICK_AMOUNTS.map(amt => (
                      <button
                        key={amt}
                        disabled={manualAdjust.isPending}
                        onClick={() => handleAdjust(amt)}
                        style={{
                          flex: 1, padding: '0.5rem 0', minHeight: 34, borderRadius: 6,
                          border: `1px solid ${adjustMode === 'add' ? 'rgba(34,197,94,0.3)' : 'rgba(139,58,31,0.3)'}`,
                          background: adjustMode === 'add' ? 'rgba(34,197,94,0.08)' : 'rgba(139,58,31,0.08)',
                          color: adjustMode === 'add' ? 'var(--ok)' : 'var(--brick-warm)',
                          fontFamily: 'var(--font-mono, monospace)', fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', opacity: manualAdjust.isPending ? 0.6 : 1,
                        }}
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                  {/* Custom amount */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="number"
                      min={1}
                      placeholder="Cantidad personalizada"
                      value={customAmount}
                      onChange={e => setCustomAmount(e.target.value)}
                      style={{
                        flex: 1, padding: '0.5rem 0.625rem', borderRadius: 6,
                        border: '1px solid var(--line)', background: 'var(--bg-2)',
                        color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13,
                        outline: 'none',
                      }}
                    />
                    <button
                      disabled={!customAmount || manualAdjust.isPending}
                      onClick={() => customAmount && handleAdjust(parseInt(customAmount, 10))}
                      style={{
                        padding: '0.5rem 0.875rem', borderRadius: 6, border: 'none',
                        background: adjustMode === 'add' ? 'var(--ok)' : 'var(--brick-warm)',
                        color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600,
                        cursor: customAmount ? 'pointer' : 'default',
                        opacity: !customAmount || manualAdjust.isPending ? 0.5 : 1,
                      }}
                    >
                      Aplicar
                    </button>
                  </div>
                  {/* Note */}
                  <input
                    type="text"
                    placeholder="Motivo (opcional)"
                    value={adjustNote}
                    onChange={e => setAdjustNote(e.target.value)}
                    style={{
                      padding: '0.5rem 0.625rem', borderRadius: 6,
                      border: '1px solid var(--line)', background: 'var(--bg-2)',
                      color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 12,
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => { setAdjustMode(null); setCustomAmount(''); setAdjustNote('') }}
                    style={{ padding: '0.375rem', borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', fontSize: 12, cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Recent transactions */}
          {transactions.length > 0 && (
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.12em', color: 'var(--fg-3)', marginBottom: '0.75rem' }}>
                HISTORIAL DE PUNTOS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {transactions.map(tx => (
                  <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.625rem', borderRadius: 7, background: 'var(--bg-3)', border: '1px solid var(--line)' }}>
                    <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10, fontWeight: 700, color: TX_TYPE_COLOR[tx.type] ?? 'var(--fg-3)', minWidth: 38, textAlign: 'right' }}>
                      {tx.points > 0 ? `+${tx.points}` : tx.points}
                    </div>
                    <div style={{ flex: 1, fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--fg-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.description}
                    </div>
                    <div style={{ fontSize: 9, fontFamily: 'var(--font-ui)', color: 'var(--fg-3)', flexShrink: 0 }}>
                      {new Date(tx.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 600, color: TX_TYPE_COLOR[tx.type] ?? 'var(--fg-3)', fontFamily: 'var(--font-ui)', flexShrink: 0 }}>
                      {TX_TYPE_LABEL[tx.type] ?? tx.type}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.12em', color: 'var(--fg-3)', marginBottom: '0.75rem' }}>ESTADÍSTICAS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              {[
                { label: 'Total visitas', value: loyaltyCard?.totalVisits ?? 0 },
                { label: `Visitas ${currentYear}`, value: stats.yearVisits },
                ...(!hideMoney ? [{ label: 'Total gastado', value: `${stats.totalSpent.toFixed(0)}€` }] : []),
                { label: 'Premios canjeados', value: redeemedIds.length },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 8, padding: '0.75rem' }}>
                  <div style={{ fontSize: 10, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--fg-0)' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent appointments */}
          {recentAppts.length > 0 && (
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.12em', color: 'var(--fg-3)', marginBottom: '0.75rem' }}>ÚLTIMAS CITAS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {recentAppts.map(a => {
                  const svc = services.find(s => s.id === a.serviceId)
                  return (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', borderRadius: 8, background: 'var(--bg-3)', border: '1px solid var(--line)' }}>
                      <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, color: 'var(--fg-2)', minWidth: 56 }}>
                        {new Date(a.startTime).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </div>
                      <div style={{ flex: 1, fontSize: 12, color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {svc?.name ?? 'Servicio'}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: STATUS_COLOR[a.status] ?? 'var(--fg-3)', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap' }}>
                        {STATUS_LABEL[a.status] ?? a.status}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
