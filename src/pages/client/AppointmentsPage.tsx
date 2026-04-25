import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useShopContext } from '@/context/ShopContext'
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

const CARD = 'bg-[var(--bg-2)] border border-[var(--line)] rounded-xl p-4 md:p-5'
const SECTION_LABEL = 'font-[var(--font-display)] text-[13px] tracking-widest text-[var(--fg-3)] mb-3.5'

export default function AppointmentsPage() {
  const { name: shopName } = useShopContext()
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
      <Helmet><title>Mis citas — {shopName}</title></Helmet>

      <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-4 md:gap-6 items-start">

        {/* Left column */}
        <div className="flex flex-col gap-4">

          {/* Próxima cita */}
          {next && nextService && nextBarber ? (
            <div
              className="rounded-xl p-4 md:p-6"
              style={{
                background: 'linear-gradient(135deg, rgba(123,79,255,0.12) 0%, rgba(123,79,255,0.04) 100%)',
                border: '1px solid rgba(123,79,255,0.25)',
                boxShadow: 'var(--glow-led)',
              }}
            >
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.15em', color: 'var(--led-soft)', marginBottom: '0.75rem' }}>
                PRÓXIMA CITA
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--fg-0)', lineHeight: 1, marginBottom: 4 }}>
                {next.time}
              </div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--fg-1)', marginBottom: '1rem' }}>
                {fmtDate(next.dateISO)}
              </div>
              <div className="flex flex-wrap gap-4 md:gap-6 mb-5">
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
                  flex: 1, padding: '0.75rem', minHeight: 44, borderRadius: 8,
                  border: '1px solid var(--line)', background: 'transparent',
                  color: 'var(--fg-1)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer',
                }}>
                  Reprogramar
                </button>
                <button
                  onClick={() => setCancelOpen(true)}
                  style={{
                    flex: 1, padding: '0.75rem', minHeight: 44, borderRadius: 8,
                    border: '1px solid rgba(192,64,64,0.4)', background: 'rgba(192,64,64,0.08)',
                    color: 'var(--danger)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Cancelar cita
                </button>
              </div>
            </div>
          ) : (
            <div className={CARD} style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--fg-2)', letterSpacing: '0.06em' }}>SIN CITAS PRÓXIMAS</div>
            </div>
          )}

          {/* Historial */}
          <div className={CARD}>
            <div className={SECTION_LABEL}>HISTORIAL</div>
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
                    <div style={{ minWidth: 0, flex: 1, marginRight: '0.75rem' }}>
                      <div style={{ fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {svc?.name}
                      </div>
                      <div style={{ fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--fg-2)', marginTop: 2 }}>
                        {h.date} · {brb?.name}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
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
        <div className="flex flex-col gap-4">
          <LoyaltyCard
            points={MOCK_LOYALTY.points}
            target={MOCK_LOYALTY.target}
            stamps={MOCK_LOYALTY.stamps}
            memberCode={MOCK_LOYALTY.memberCode}
          />

          {/* Stats */}
          <div className={CARD}>
            <div className={SECTION_LABEL}>ESTADÍSTICAS</div>
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
          <div className={CARD}>
            <div className={SECTION_LABEL}>RECOMPENSAS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {MOCK_REWARDS.map(r => {
                const canRedeem = MOCK_LOYALTY.points >= r.cost && !redeemed.includes(r.id)
                const isRedeemed = redeemed.includes(r.id)
                return (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.75rem', borderRadius: 8,
                    background: 'var(--bg-3)',
                    border: isRedeemed ? '1px solid rgba(109,187,109,0.2)' : '1px solid var(--line)',
                    opacity: !canRedeem && !isRedeemed ? 0.5 : 1,
                    gap: '0.75rem',
                  }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)', fontWeight: 500 }}>{r.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-ui)' }}>{r.cost} pts</div>
                    </div>
                    {isRedeemed ? (
                      <span style={{ fontSize: 11, color: 'var(--ok)', fontFamily: 'var(--font-ui)', flexShrink: 0 }}>✓ Canjeado</span>
                    ) : (
                      <button
                        disabled={!canRedeem}
                        onClick={() => setRedeemTarget(r)}
                        style={{
                          padding: '0.5rem 0.875rem', minHeight: 36, borderRadius: 6, flexShrink: 0,
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
    </>
  )
}
