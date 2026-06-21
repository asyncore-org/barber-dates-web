import type { LoyaltyPointsStatus } from '@/domain/loyalty'
import {
  useAdminAwardPoints, useAdminRevokePoints,
  useLoyaltyStatusForAppointment, useServiceLoyaltyPoints,
} from '@/hooks/useLoyalty'

interface Props {
  appointmentId: string
  clientId: string
  serviceId: string
  endTime: string
}

export function AppointmentLoyaltyControls({ appointmentId, clientId, serviceId, endTime }: Props) {
  const { data: status, refetch } = useLoyaltyStatusForAppointment(appointmentId, clientId)
  const { data: servicePts }      = useServiceLoyaltyPoints(serviceId)
  const awardMut  = useAdminAwardPoints()
  const revokeMut = useAdminRevokePoints()

  if (new Date(endTime) >= new Date()) return null

  const currentStatus: LoyaltyPointsStatus = status ?? 'none'
  const pts       = servicePts && servicePts > 0 ? servicePts : 10
  const isPending = awardMut.isPending || revokeMut.isPending
  const awarded   = currentStatus === 'awarded'

  const handleToggle = () => {
    if (awarded) {
      revokeMut.mutate({ appointmentId, clientId }, { onSuccess: () => void refetch() })
    } else {
      awardMut.mutate({ appointmentId, clientId, points: pts }, { onSuccess: () => void refetch() })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontFamily: 'var(--font-ui)', letterSpacing: '0.14em', color: 'var(--fg-4)', textTransform: 'uppercase' }}>
          Puntos fidelización
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-ui)',
          padding: '2px 9px', borderRadius: 20,
          background: awarded ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
          color:      awarded ? 'var(--ok)'            : 'var(--fg-4)',
          border:     awarded ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.08)',
        }}>
          {awarded ? `✓ +${pts} pts asignados` : `◌ Sin puntos`}
        </span>
      </div>

      {/* Single toggle button */}
      <button
        disabled={isPending}
        onClick={handleToggle}
        style={{
          width: '100%', minHeight: 40, borderRadius: 8,
          fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600,
          cursor: isPending ? 'default' : 'pointer',
          border: awarded ? '1px solid rgba(139,58,31,0.4)' : '1px solid rgba(34,197,94,0.4)',
          background: awarded ? 'rgba(139,58,31,0.1)' : 'rgba(34,197,94,0.1)',
          color: awarded ? 'var(--brick-warm)' : 'var(--ok)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          opacity: isPending ? 0.5 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        {awarded ? (
          <>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M5 12h14"/></svg>
            Quitar puntos
          </>
        ) : (
          <>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Asignar {pts} pts
          </>
        )}
      </button>
    </div>
  )
}
