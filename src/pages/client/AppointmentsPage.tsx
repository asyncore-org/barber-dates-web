import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { LoyaltyCard } from '@/components/loyalty'
import { ConfirmDialog } from '@/components/ui'
import {
  MOCK_APPOINTMENTS, MOCK_HISTORY, MOCK_LOYALTY, MOCK_REWARDS,
  MOCK_SERVICES, MOCK_BARBERS,
} from '@/lib/mock-data'
import type { MockReward } from '@/lib/mock-data'

function serviceById(id: string) {
  return MOCK_SERVICES.find(s => s.id === id)
}
function barberById(id: string) {
  return MOCK_BARBERS.find(b => b.id === id)
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function AppointmentsPage() {
  const next = MOCK_APPOINTMENTS.find(a => a.status === 'upcoming')
  const nextService = next ? serviceById(next.serviceId) : null
  const nextBarber = next ? barberById(next.barberId) : null

  const [cancelOpen, setCancelOpen] = useState(false)
  const [redeemTarget, setRedeemTarget] = useState<MockReward | null>(null)
  const [redeemed, setRedeemed] = useState<string[]>([])

  const handleRedeem = () => {
    if (!redeemTarget) return
    setRedeemed(r => [...r, redeemTarget.id])
    setRedeemTarget(null)
  }

  return (
    <>
      <Helmet><title>Mis citas — Gio Barber Shop</title></Helmet>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.5rem', alignItems: 'start' }}
        className="appointments-grid">

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Próxima cita */}
          {next && nextService && nextBarber ? (
            <div style={{
              background: 'linear-gradient(135deg, rgba(123,79,255,0.12) 0%, rgba(123,79,255,0.04) 100%)',
              border: '1px solid rgba(123,79,255,0.25)',
              borderRadius: 12, padding: '1.5rem',
              boxShadow: 'var(--glow-led)',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.15em', color: 'var(--led-soft)', marginBottom: '0.75rem' }}>
                PRÓXIMA CITA
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--fg-0)', lineHeight: 1, marginBottom: 4 }}>
                {next.time}
              </div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--fg-1)', marginBottom: '1rem' }}>
                {fmtDate(next.dateISO)}
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem' }}>
                {[
                  { label: 'Servicio', value: nextService.name },
                  { label: 'Barbero', value: nextBarber.name },
                  { label: 'Duración', value: `${nextService.duration} min` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                    <div style={{ fontSize: 14, color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontWeight: 600, marginTop: 2 }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button style={{
                  flex: 1, padding: '0.6rem', borderRadius: 8,
                  border: '1px solid var(--line)', background: 'transparent',
                  color: 'var(--fg-1)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer',
                }}>
                  Reprogramar
                </button>
                <button
                  onClick={() => setCancelOpen(true)}
                  style={{
                    flex: 1, padding: '0.6rem', borderRadius: 8,
                    border: '1px solid rgba(192,64,64,0.4)', background: 'rgba(192,64,64,0.08)',
                    color: 'var(--danger)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer',
                  }}>
                  Cancelar cita
                </button>
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--fg-2)', letterSpacing: '0.06em' }}>SIN CITAS PRÓXIMAS</div>
            </div>
          )}

          {/* Historial */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '1.25rem' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.12em', color: 'var(--fg-3)', marginBottom: '1rem' }}>
              HISTORIAL
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {MOCK_HISTORY.map(h => {
                const svc = serviceById(h.serviceId)
                const brb = barberById(h.barberId)
                return (
                  <div key={h.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.75rem', borderRadius: 8, background: 'var(--bg-3)',
                    border: '1px solid var(--line)',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)', fontWeight: 500 }}>
                        {svc?.name}
                      </div>
                      <div style={{ fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--fg-2)', marginTop: 2 }}>
                        {h.date} · {brb?.name}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--fg-0)' }}>{h.price}€</div>
                      <div style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-ui)' }}>+{h.points} pts</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <LoyaltyCard
            points={MOCK_LOYALTY.points}
            target={MOCK_LOYALTY.target}
            stamps={MOCK_LOYALTY.stamps}
            memberCode={MOCK_LOYALTY.memberCode}
          />

          {/* Stats */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '1.25rem' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.12em', color: 'var(--fg-3)', marginBottom: '0.875rem' }}>
              ESTADÍSTICAS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[
                { label: 'Visitas totales', value: MOCK_LOYALTY.totalVisits },
                { label: 'Este año', value: MOCK_LOYALTY.yearVisits },
                { label: 'Gasto total', value: `${MOCK_LOYALTY.totalSpent}€` },
                { label: 'Canjeados', value: MOCK_LOYALTY.redeemedCount },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: '0.75rem', background: 'var(--bg-3)', borderRadius: 8, border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: 10, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--fg-0)', marginTop: 4 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Rewards */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '1.25rem' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.12em', color: 'var(--fg-3)', marginBottom: '0.875rem' }}>
              RECOMPENSAS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {MOCK_REWARDS.map(r => {
                const canRedeem = MOCK_LOYALTY.points >= r.cost && !redeemed.includes(r.id)
                const isRedeemed = redeemed.includes(r.id)
                return (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.65rem 0.875rem', borderRadius: 8,
                    background: 'var(--bg-3)',
                    border: isRedeemed ? '1px solid rgba(109,187,109,0.2)' : '1px solid var(--line)',
                    opacity: !canRedeem && !isRedeemed ? 0.5 : 1,
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)', fontWeight: 500 }}>{r.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-ui)' }}>{r.cost} pts</div>
                    </div>
                    {isRedeemed ? (
                      <span style={{ fontSize: 11, color: 'var(--ok)', fontFamily: 'var(--font-ui)' }}>✓ Canjeado</span>
                    ) : (
                      <button
                        disabled={!canRedeem}
                        onClick={() => setRedeemTarget(r)}
                        style={{
                          padding: '0.3rem 0.65rem', borderRadius: 6,
                          border: canRedeem ? '1px solid var(--gold)' : '1px solid var(--line)',
                          background: 'transparent',
                          color: canRedeem ? 'var(--gold)' : 'var(--fg-3)',
                          fontFamily: 'var(--font-ui)', fontSize: 12, cursor: canRedeem ? 'pointer' : 'default',
                        }}
                      >
                        Canjear
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {cancelOpen && (
        <ConfirmDialog
          title="Cancelar cita"
          message="¿Seguro que quieres cancelar tu próxima cita? Esta acción no se puede deshacer."
          confirmLabel="Sí, cancelar"
          danger
          onConfirm={() => setCancelOpen(false)}
          onCancel={() => setCancelOpen(false)}
        />
      )}

      {redeemTarget && (
        <ConfirmDialog
          title="Canjear recompensa"
          message={`¿Quieres canjear "${redeemTarget.label}" por ${redeemTarget.cost} puntos?`}
          confirmLabel="Canjear"
          onConfirm={handleRedeem}
          onCancel={() => setRedeemTarget(null)}
        />
      )}

      <style>{`
        @media (max-width: 768px) {
          .appointments-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
