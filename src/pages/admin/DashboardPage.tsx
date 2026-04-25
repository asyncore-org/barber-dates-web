import { useState, useEffect, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { useShopContext } from '@/context/ShopContext'
import { Icon } from '@/components/ui'
import { AgendaListView, NewAppointmentModal } from '@/components/admin'
import { MOCK_BARBERS } from '@/lib/mock-data'

const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const HOURS = Array.from({ length: 11 }, (_, i) => i + 9) // 9 → 19

interface WeekAppt {
  id: string
  day: number
  startH: number
  startM: number
  durationMin: number
  client: string
  service: string
  barberId: string
  color: 'led' | 'brick' | 'gold'
}

const WEEK_APPOINTMENTS: WeekAppt[] = [
  { id: 'w1',  day: 0, startH: 10, startM: 0,  durationMin: 45, client: 'Carlos M.',   service: 'Corte + Barba',         barberId: 'b1', color: 'led' },
  { id: 'w2',  day: 0, startH: 11, startM: 30, durationMin: 30, client: 'Rubén G.',    service: 'Corte Clásico',          barberId: 'b2', color: 'brick' },
  { id: 'w3',  day: 0, startH: 14, startM: 0,  durationMin: 60, client: 'Javier P.',   service: 'Corte Premium',          barberId: 'b1', color: 'led' },
  { id: 'w4',  day: 1, startH: 9,  startM: 30, durationMin: 45, client: 'Miguel Á.',   service: 'Corte + Barba',         barberId: 'b2', color: 'brick' },
  { id: 'w5',  day: 1, startH: 11, startM: 0,  durationMin: 30, client: 'Toni R.',     service: 'Afeitado Tradicional',   barberId: 'b1', color: 'gold' },
  { id: 'w6',  day: 1, startH: 16, startM: 0,  durationMin: 75, client: 'Álex F.',     service: 'Tinte + Corte',          barberId: 'b2', color: 'brick' },
  { id: 'w7',  day: 2, startH: 10, startM: 30, durationMin: 30, client: 'Marc V.',     service: 'Corte Clásico',          barberId: 'b1', color: 'led' },
  { id: 'w8',  day: 2, startH: 12, startM: 0,  durationMin: 45, client: 'Sergio L.',   service: 'Corte + Barba',         barberId: 'b2', color: 'brick' },
  { id: 'w9',  day: 2, startH: 15, startM: 30, durationMin: 60, client: 'Iván M.',     service: 'Corte Premium',          barberId: 'b1', color: 'led' },
  { id: 'w10', day: 3, startH: 9,  startM: 0,  durationMin: 25, client: 'Leo (niño)',  service: 'Niños (-12)',            barberId: 'b2', color: 'gold' },
  { id: 'w11', day: 3, startH: 11, startM: 30, durationMin: 45, client: 'Raúl C.',     service: 'Corte + Barba',         barberId: 'b1', color: 'led' },
  { id: 'w12', day: 3, startH: 17, startM: 0,  durationMin: 30, client: 'Paco G.',     service: 'Afeitado Tradicional',   barberId: 'b2', color: 'gold' },
  { id: 'w13', day: 4, startH: 10, startM: 0,  durationMin: 30, client: 'Daniel H.',   service: 'Corte Clásico',          barberId: 'b1', color: 'brick' },
  { id: 'w14', day: 4, startH: 13, startM: 0,  durationMin: 75, client: 'Omar S.',     service: 'Tinte + Corte',          barberId: 'b2', color: 'brick' },
  { id: 'w15', day: 4, startH: 16, startM: 30, durationMin: 45, client: 'Dani R.',     service: 'Corte + Barba',         barberId: 'b1', color: 'led' },
  { id: 'w16', day: 5, startH: 9,  startM: 30, durationMin: 30, client: 'Vicent M.',   service: 'Corte Clásico',          barberId: 'b2', color: 'gold' },
  { id: 'w17', day: 5, startH: 10, startM: 30, durationMin: 60, client: 'Lucas B.',    service: 'Corte Premium',          barberId: 'b1', color: 'led' },
  { id: 'w18', day: 5, startH: 12, startM: 0,  durationMin: 45, client: 'Andrés T.',   service: 'Corte + Barba',         barberId: 'b2', color: 'brick' },
]

const COLOR_MAP = {
  led:   { bg: 'rgba(123,79,255,0.18)',  border: 'var(--led)',       text: 'var(--led-soft)' },
  brick: { bg: 'rgba(139,58,31,0.2)',    border: 'var(--brick-warm)', text: 'var(--brick-warm)' },
  gold:  { bg: 'rgba(201,162,74,0.15)', border: 'var(--gold)',       text: 'var(--gold)' },
}

const CELL_HEIGHT_PX = 56
const DAY_START_H = 9

function topPx(h: number, m: number) {
  return ((h - DAY_START_H) * 60 + m) / 60 * CELL_HEIGHT_PX
}
function heightPx(min: number) {
  return min / 60 * CELL_HEIGHT_PX
}

function getWeekStart(ref: Date) {
  const d = new Date(ref)
  const dow = (d.getDay() + 6) % 7 // Mon=0
  d.setDate(d.getDate() - dow)
  d.setHours(0, 0, 0, 0)
  return d
}

export default function DashboardPage() {
  const { name: shopName } = useShopContext()
  const [weekOffset, setWeekOffset] = useState(0)
  const [dayOffset, setDayOffset] = useState(0)
  const [selectedAppt, setSelectedAppt] = useState<WeekAppt | null>(null)
  const [newApptOpen, setNewApptOpen] = useState(false)
  const [newApptToast, setNewApptToast] = useState(false)
  const nowLineRef = useRef<HTMLDivElement>(null)

  const handleNewApptConfirm = () => {
    setNewApptOpen(false)
    setNewApptToast(true)
    setTimeout(() => setNewApptToast(false), 3000)
  }

  const weekStart = getWeekStart(new Date())
  weekStart.setDate(weekStart.getDate() + weekOffset * 7)

  const now = new Date()
  const nowTop = topPx(now.getHours(), now.getMinutes())

  useEffect(() => {
    nowLineRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [])

  const todayCols = (now.getDay() + 6) % 7

  // Mobile: current day column (0=Mon, capped at 0-5)
  const mobileDayCol = Math.max(0, Math.min(5, todayCols + dayOffset))
  const mobileDayDate = new Date(getWeekStart(new Date()))
  mobileDayDate.setDate(mobileDayDate.getDate() + mobileDayCol)

  const metrics = [
    { label: 'Citas hoy', value: WEEK_APPOINTMENTS.filter(a => a.day === todayCols).length, icon: 'calendar' as const, color: 'var(--led)' },
    { label: 'Ingresos est.', value: '214€', icon: 'euro' as const, color: 'var(--gold)' },
    { label: 'Barberos activos', value: MOCK_BARBERS.filter(b => b.active).length, icon: 'users' as const, color: 'var(--brick-warm)' },
    { label: 'Lista de espera', value: 3, icon: 'clock' as const, color: 'var(--fg-2)' },
  ]

  const upcomingToday = WEEK_APPOINTMENTS.filter(a => a.day === todayCols)
    .sort((a, b) => a.startH * 60 + a.startM - (b.startH * 60 + b.startM))

  return (
    <>
      <Helmet><title>Agenda — {shopName}</title></Helmet>

      {newApptToast && (
        <div
          className="fixed top-[72px] right-3 z-[200] md:top-6 md:right-6"
          style={{ background: 'var(--ok)', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 8, fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, boxShadow: 'var(--shadow-md)' }}
        >
          ✓ Cita añadida correctamente
        </div>
      )}

      {/* Mobile-only: day agenda first, then metrics */}
      <div className="md:hidden flex flex-col gap-4 mb-4">
        {/* Day agenda — first */}
        <AgendaListView
          items={WEEK_APPOINTMENTS.filter(a => a.day === mobileDayCol)}
          barbers={MOCK_BARBERS}
          date={mobileDayDate}
          onPrevDay={() => setDayOffset(o => Math.max(o - 1, -(todayCols)))}
          onNextDay={() => setDayOffset(o => Math.min(o + 1, 5 - todayCols))}
          onSelect={(item) => setSelectedAppt(WEEK_APPOINTMENTS.find(a => a.id === item.id) ?? null)}
        />

        {/* Nueva cita button */}
        <button
          onClick={() => setNewApptOpen(true)}
          className="flex items-center justify-center gap-2 w-full rounded-xl"
          style={{
            padding: '0.875rem', minHeight: 48,
            border: 'none', background: 'var(--led)', color: '#fff',
            fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', boxShadow: 'var(--glow-led)',
          }}
        >
          <Icon name="plus" size={16} />
          Nueva cita
        </button>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-3">
          {metrics.map(m => (
            <div key={m.label} style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 10, padding: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                <Icon name={m.icon} size={13} />
                <span style={{ fontSize: 10, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{m.label}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Barbers (mobile) */}
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '1rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.12em', color: 'var(--fg-3)', marginBottom: '0.875rem' }}>
            BARBEROS
          </div>
          <div className="flex flex-col gap-2">
            {MOCK_BARBERS.map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: 8, background: 'var(--bg-3)', border: '1px solid var(--line)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: b.active ? 'var(--led)' : 'var(--bg-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: b.active ? '#fff' : 'var(--fg-3)' }}>
                  {b.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)', fontWeight: 500 }}>{b.name}</div>
                  <div style={{ fontSize: 12, fontFamily: 'var(--font-ui)', color: 'var(--fg-2)' }}>{b.role}</div>
                </div>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: b.active ? 'var(--ok)' : 'var(--fg-3)',
                  boxShadow: b.active ? '0 0 6px var(--ok)' : 'none',
                }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop: two-column layout */}
      <div className="hidden md:grid md:grid-cols-[1fr_360px] gap-6 items-start">

        {/* Left: agenda semanal */}
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button onClick={() => setWeekOffset(o => o - 1)} style={navBtn}><Icon name="chevronL" size={14} /></button>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.06em', color: 'var(--fg-0)' }}>
                Semana del {weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </span>
              <button onClick={() => setWeekOffset(o => o + 1)} style={navBtn}><Icon name="chevronR" size={14} /></button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setWeekOffset(0)} style={{ ...navBtn, padding: '0.25rem 0.6rem', fontSize: 11, fontFamily: 'var(--font-ui)' }}>
                Hoy
              </button>
              <button
                onClick={() => setNewApptOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', borderRadius: 6, border: 'none', background: 'var(--led)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer', boxShadow: 'var(--glow-led)' }}
              >
                <Icon name="plus" size={13} />
                Nueva cita
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(6, 1fr)', borderBottom: '1px solid var(--line)' }}>
            <div />
            {DAYS_ES.map((d, i) => {
              const dayDate = new Date(weekStart)
              dayDate.setDate(dayDate.getDate() + i)
              const isToday = weekOffset === 0 && i === todayCols
              return (
                <div key={d} style={{ padding: '0.6rem 0', textAlign: 'center', borderLeft: '1px solid var(--line)' }}>
                  <div style={{ fontSize: 10, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{d}</div>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: 20,
                    color: isToday ? 'var(--led-soft)' : 'var(--fg-0)',
                    lineHeight: 1.1,
                    textShadow: isToday ? '0 0 16px rgba(123,79,255,0.5)' : 'none',
                  }}>
                    {dayDate.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Grid body */}
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(6, 1fr)', position: 'relative' }}>
              {/* Hour labels */}
              <div>
                {HOURS.map(h => (
                  <div key={h} style={{ height: CELL_HEIGHT_PX, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8, paddingTop: 4 }}>
                    <span style={{ fontSize: 10, color: 'var(--fg-3)', fontFamily: 'var(--font-mono, monospace)' }}>{h}:00</span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {DAYS_ES.map((_, colIdx) => (
                <div key={colIdx} style={{ borderLeft: '1px solid var(--line)', position: 'relative', minHeight: CELL_HEIGHT_PX * HOURS.length }}>
                  {HOURS.map(h => (
                    <div key={h} style={{ height: CELL_HEIGHT_PX, borderTop: '1px solid var(--line)', opacity: 0.4 }} />
                  ))}

                  {weekOffset === 0 && colIdx === todayCols && (
                    <div
                      ref={nowLineRef}
                      style={{
                        position: 'absolute',
                        left: 0, right: 0,
                        top: nowTop,
                        height: 2,
                        background: 'var(--led)',
                        boxShadow: '0 0 8px rgba(123,79,255,0.8)',
                        zIndex: 5,
                        pointerEvents: 'none',
                      }}
                    />
                  )}

                  {WEEK_APPOINTMENTS.filter(a => a.day === colIdx).map(appt => {
                    const c = COLOR_MAP[appt.color]
                    return (
                      <div
                        key={appt.id}
                        onClick={() => setSelectedAppt(appt)}
                        style={{
                          position: 'absolute',
                          left: 3, right: 3,
                          top: topPx(appt.startH, appt.startM),
                          height: Math.max(heightPx(appt.durationMin), 24),
                          background: c.bg,
                          border: `1px solid ${c.border}`,
                          borderRadius: 6,
                          padding: '3px 6px',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          zIndex: 4,
                        }}
                      >
                        <div style={{ fontSize: 10, fontWeight: 700, color: c.text, fontFamily: 'var(--font-ui)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {appt.client}
                        </div>
                        {heightPx(appt.durationMin) > 30 && (
                          <div style={{ fontSize: 9, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {appt.service}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Upcoming today — first */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '1.25rem' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.12em', color: 'var(--fg-3)', marginBottom: '0.875rem' }}>
              HOY · PRÓXIMAS CITAS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {upcomingToday.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)' }}>Sin más citas hoy</div>
              )}
              {upcomingToday.slice(0, 5).map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem', borderRadius: 8, background: 'var(--bg-3)', border: '1px solid var(--line)' }}>
                  <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 13, color: 'var(--fg-0)', minWidth: 40 }}>
                    {`${a.startH.toString().padStart(2,'0')}:${a.startM.toString().padStart(2,'0')}`}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)', fontWeight: 500 }}>{a.client}</div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--fg-2)' }}>{a.service}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {metrics.map(m => (
              <div key={m.label} style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 10, padding: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <Icon name={m.icon} size={13} />
                  <span style={{ fontSize: 10, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{m.label}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Barbers */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '1.25rem' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.12em', color: 'var(--fg-3)', marginBottom: '0.875rem' }}>
              BARBEROS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {MOCK_BARBERS.map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem', borderRadius: 8, background: 'var(--bg-3)', border: '1px solid var(--line)' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: b.active ? 'var(--led)' : 'var(--bg-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: b.active ? '#fff' : 'var(--fg-3)' }}>
                    {b.initials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)', fontWeight: 500 }}>{b.name}</div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--fg-2)' }}>{b.role}</div>
                  </div>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: b.active ? 'var(--ok)' : 'var(--fg-3)',
                    boxShadow: b.active ? '0 0 6px var(--ok)' : 'none',
                  }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* New appointment modal */}
      {newApptOpen && (
        <NewAppointmentModal
          onClose={() => setNewApptOpen(false)}
          onConfirm={handleNewApptConfirm}
        />
      )}

      {/* Appointment detail modal */}
      {selectedAppt && (
        <div
          onClick={() => setSelectedAppt(null)}
          style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 360, boxShadow: 'var(--shadow-lg)' }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.12em', color: 'var(--fg-3)', marginBottom: '1rem' }}>
              DETALLE DE CITA
            </div>
            {[
              { label: 'Cliente', value: selectedAppt.client },
              { label: 'Servicio', value: selectedAppt.service },
              { label: 'Hora', value: `${selectedAppt.startH.toString().padStart(2,'0')}:${selectedAppt.startM.toString().padStart(2,'0')}` },
              { label: 'Duración', value: `${selectedAppt.durationMin} min` },
              { label: 'Barbero', value: MOCK_BARBERS.find(b => b.id === selectedAppt.barberId)?.name ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: 13, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)' }}>{label}</span>
                <span style={{ fontSize: 13, color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontWeight: 500 }}>{value}</span>
              </div>
            ))}
            <button
              onClick={() => setSelectedAppt(null)}
              style={{ width: '100%', marginTop: '1rem', padding: '0.75rem', minHeight: 44, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-1)', fontFamily: 'var(--font-ui)', cursor: 'pointer' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  )
}

const navBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 32, height: 32, borderRadius: 6,
  border: '1px solid var(--line)', background: 'transparent',
  color: 'var(--fg-2)', cursor: 'pointer',
}
