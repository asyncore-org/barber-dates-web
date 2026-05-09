import { useMemo } from 'react'
import { useLoyaltyCard, useRewards, useRedeemedRewardIds } from '@/hooks/useLoyalty'
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

function calcInitials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?'
}

export function ClientProfileModal({ clientId, clientName, onClose, hideMoney = false }: Props) {
  const { data: profile } = useClientProfile(clientId)
  const { data: loyaltyCard } = useLoyaltyCard(clientId)
  const { data: loyaltyConfig } = useLoyaltyConfig()
  const { data: rewards = [] } = useRewards()
  const { data: redeemedIds = [] } = useRedeemedRewardIds(clientId)
  const { data: appointments = [] } = useClientAppointments(clientId)
  const { data: services = [] } = useAllServices()

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

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 14,
          width: '100%', maxWidth: 420, maxHeight: '90dvh',
          overflowY: 'auto', boxShadow: 'var(--shadow-lg)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'var(--led)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 16, color: '#fff', flexShrink: 0,
            boxShadow: 'var(--glow-led)',
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
              points={loyaltyCard.points}
              target={loyaltyConfig?.stampGoal ?? 10}
              stamps={loyaltyCard.totalVisits}
              memberCode={loyaltyCard.memberCode ?? '—'}
              rewards={rewards}
            />
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
