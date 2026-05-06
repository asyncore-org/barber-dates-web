import { useState, useMemo, useEffect, useRef, useSyncExternalStore } from 'react'
import { Helmet } from 'react-helmet-async'
import { useShopContext } from '@/context/ShopContext'
import { Icon } from '@/components/ui'
import { AgendaListView, RescheduleModal, ClientProfileModal } from '@/components/admin'
import type { WeekAppt, RescheduleUpdate } from '@/components/admin'
import { useBarbers } from '@/hooks/useBarbers'
import { useAllServices } from '@/hooks/useServices'
import { useBarberAppointments, useUpdateAppointment } from '@/hooks/useAppointments'
import { useWeeklySchedule } from '@/hooks/useSchedule'
import { DEFAULT_WEEKLY_SCHEDULE } from '@/domain/schedule'
import { useLoyaltyCardsForClients, useAutoAwardPoints, useCancelAppointmentWithDeduction } from '@/hooks/useLoyalty'
import { useLoyaltyConfig } from '@/hooks/useShopConfig'
import { LoyaltyProgressBar } from '@/components/loyalty'
import { useAuthStore } from '@/stores/authStore'

const landscapeMq = typeof window !== 'undefined'
  ? window.matchMedia('(orientation: landscape) and (max-height: 600px)')
  : null

function useLandscape() {
  return useSyncExternalStore(
    cb => { landscapeMq?.addEventListener('change', cb); return () => landscapeMq?.removeEventListener('change', cb) },
    () => landscapeMq?.matches ?? false,
    () => false,
  )
}

const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const HOURS = Array.from({ length: 11 }, (_, i) => i + 9)

const COLOR_MAP = {
  led:   { bg: 'rgba(123,79,255,0.18)',  border: 'var(--led)',       text: 'var(--led-soft)' },
  brick: { bg: 'rgba(139,58,31,0.2)',    border: 'var(--brick-warm)', text: 'var(--brick-warm)' },
  gold:  { bg: 'rgba(201,162,74,0.15)', border: 'var(--gold)',       text: 'var(--gold)' },
}

const CELL_HEIGHT_PX = 56
const DAY_START_H = 9
const MAX_TOP_PX = CELL_HEIGHT_PX * (HOURS.length - 1)

function topPx(h: number, m: number) {
  return ((h - DAY_START_H) * 60 + m) / 60 * CELL_HEIGHT_PX
}
function heightPx(min: number) {
  return min / 60 * CELL_HEIGHT_PX
}

function getWeekStart(ref: Date) {
  const d = new Date(ref)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  d.setHours(0, 0, 0, 0)
  return d
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

function combineDateSlot(date: Date, slot: string): Date {
  const [h, m] = slot.split(':').map(Number)
  const result = new Date(date)
  result.setHours(h, m, 0, 0)
  return result
}

export default function BarberPage() {
  const isLandscape = useLandscape()
  const { name: shopName } = useShopContext()
  const user = useAuthStore(s => s.user)
  const { data: barbers = [] } = useBarbers()
  const { data: services = [] } = useAllServices()
  const { data: schedule = DEFAULT_WEEKLY_SCHEDULE } = useWeeklySchedule()
  const updateApptMut = useUpdateAppointment()
  const cancelWithDeduction = useCancelAppointmentWithDeduction()

  const currentBarber = useMemo(
    () => barbers.find(b => b.email != null && user?.email != null && b.email === user.email) ?? null,
    [barbers, user],
  )

  const { data: dbAppointments = [] } = useBarberAppointments(currentBarber?.id)

  const { data: loyaltyConfig } = useLoyaltyConfig()
  const uniqueClientIds = useMemo(
    () => [...new Set(dbAppointments.map(a => a.clientId))],
    [dbAppointments],
  )
  const { data: loyaltyCards } = useLoyaltyCardsForClients(uniqueClientIds)
  useAutoAwardPoints(dbAppointments)

  const [weekOffset, setWeekOffset] = useState(0)
  const [dayOffset, setDayOffset] = useState(0)
  const [selectedAppt, setSelectedAppt] = useState<WeekAppt | null>(null)
  const [rescheduleAppt, setRescheduleAppt] = useState<WeekAppt | null>(null)
  const [rescheduleToast, setRescheduleToast] = useState(false)
  const [profileClientId, setProfileClientId] = useState<string | null>(null)
  const nowLineRef = useRef<HTMLDivElement>(null)

  const weekStart = useMemo(() => {
    const ws = getWeekStart(new Date())
    ws.setDate(ws.getDate() + weekOffset * 7)
    return ws
  }, [weekOffset])

  const appointments = useMemo<WeekAppt[]>(() => {
    return dbAppointments
      .filter(a => a.status !== 'cancelled' && a.status !== 'no_show')
      .flatMap(a => {
        const start = new Date(a.startTime)
        const end = new Date(a.endTime)
        const dayDiff = Math.round((start.getTime() - weekStart.getTime()) / 86_400_000)
        if (dayDiff < 0 || dayDiff > 6) return []
        const svc = services.find(s => s.id === a.serviceId)
        return [{
          id: a.id,
          day: dayDiff,
          startH: start.getHours(),
          startM: start.getMinutes(),
          durationMin: Math.round((end.getTime() - start.getTime()) / 60_000),
          client: a.clientName ?? `Cliente ${a.clientId.slice(0, 6)}`,
          clientId: a.clientId,
          service: svc?.name ?? 'Servicio',
          barberId: a.barberId,
          color: 'led' as const,
        } satisfies WeekAppt]
      })
  }, [dbAppointments, weekStart, services])

  const selectedApptFull = useMemo(
    () => selectedAppt ? (dbAppointments.find(a => a.id === selectedAppt.id) ?? null) : null,
    [selectedAppt, dbAppointments],
  )

  const handleRescheduleConfirm = (update: RescheduleUpdate) => {
    if (!rescheduleAppt) return
    const svc = services.find(s => s.id === update.serviceId)
    if (!svc) return
    const startDt = combineDateSlot(update.date, update.slot)
    const endDt = addMinutes(startDt, svc.durationMinutes)
    updateApptMut.mutate(
      { id: rescheduleAppt.id, data: { startTime: startDt.toISOString(), endTime: endDt.toISOString(), barberId: update.barberId, serviceId: update.serviceId } },
      {
        onSuccess: () => {
          setRescheduleAppt(null)
          setSelectedAppt(null)
          setRescheduleToast(true)
          setTimeout(() => setRescheduleToast(false), 3000)
        },
      },
    )
  }

  const now = new Date()
  const nowTop = Math.min(topPx(now.getHours(), now.getMinutes()), MAX_TOP_PX)

  useEffect(() => {
    nowLineRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [])

  const todayCols = (now.getDay() + 6) % 7
  const mobileDayCol = Math.max(0, Math.min(6, todayCols + dayOffset))
  const mobileDayDate = new Date(getWeekStart(new Date()))
  mobileDayDate.setDate(mobileDayDate.getDate() + mobileDayCol)

  const todayAppts = appointments.filter(a => a.day === todayCols)

  const landscapeRows = useMemo(() => {
    const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0)
    const tomorrowDate = new Date(todayDate); tomorrowDate.setDate(tomorrowDate.getDate() + 1)
    const todayStr = todayDate.toISOString().slice(0, 10)
    const tomorrowStr = tomorrowDate.toISOString().slice(0, 10)
    const base = dbAppointments.filter(a => a.status !== 'cancelled' && a.status !== 'no_show')
    const mapAppts = (dateStr: string): WeekAppt[] =>
      base
        .filter(a => new Date(a.startTime).toISOString().slice(0, 10) === dateStr)
        .map(a => {
          const start = new Date(a.startTime)
          const end = new Date(a.endTime)
          const svc = services.find(s => s.id === a.serviceId)
          return {
            id: a.id, day: 0,
            startH: start.getHours(), startM: start.getMinutes(),
            durationMin: Math.round((end.getTime() - start.getTime()) / 60_000),
            client: a.clientName ?? `Cliente ${a.clientId.slice(0, 6)}`,
            clientId: a.clientId,
            service: svc?.name ?? 'Servicio',
            barberId: a.barberId,
            color: 'led' as const,
          } satisfies WeekAppt
        })
    return [
      { label: 'Hoy',    date: todayDate,    appts: mapAppts(todayStr) },
      { label: 'Mañana', date: tomorrowDate, appts: mapAppts(tomorrowStr) },
    ]
  }, [dbAppointments, services])

  return (
    <>
      <Helmet><title>Mi agenda — {shopName}</title></Helmet>

      {rescheduleToast && (
        <div
          className="fixed top-[72px] right-3 z-[200] md:top-6 md:right-6"
          style={{ background: 'var(--ok)', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 8, fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, boxShadow: 'var(--shadow-md)' }}
        >
          ✓ Cita reprogramada correctamente
        </div>
      )}

      {/* Mobile */}
      <div className={`md:hidden flex flex-col gap-4 mb-4${isLandscape ? ' hidden' : ''}`}>
        <AgendaListView
          items={appointments.filter(a => a.day === mobileDayCol)}
          barbers={barbers.map(b => ({ id: b.id, name: b.fullName }))}
          date={mobileDayDate}
          onPrevDay={() => setDayOffset(o => Math.max(o - 1, -(todayCols)))}
          onNextDay={() => setDayOffset(o => Math.min(o + 1, 6 - todayCols))}
          onSelect={(item) => setSelectedAppt(appointments.find(a => a.id === item.id) ?? null)}
        />

        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 10, padding: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Icon name="calendar" size={14} />
          <span style={{ fontSize: 13, color: 'var(--fg-1)', fontFamily: 'var(--font-ui)' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--led)', marginRight: 4 }}>{todayAppts.length}</span>
            citas hoy
          </span>
        </div>
      </div>

      {/* Desktop + landscape */}
      <div className={`${isLandscape ? 'flex flex-col gap-4' : 'hidden md:grid md:grid-cols-[1fr_300px]'} gap-6 items-start`}>

        {/* Calendar */}
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button onClick={() => setWeekOffset(o => o - 1)} style={navBtn}><Icon name="chevronL" size={14} /></button>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.06em', color: 'var(--fg-0)' }}>
                Semana del {weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </span>
              <button onClick={() => setWeekOffset(o => o + 1)} style={navBtn}><Icon name="chevronR" size={14} /></button>
            </div>
            <button onClick={() => setWeekOffset(0)} style={{ ...navBtn, padding: '0.25rem 0.6rem', fontSize: 11, fontFamily: 'var(--font-ui)' }}>
              Hoy
            </button>
          </div>

          {isLandscape ? (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: 560 }}>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'var(--bg-2)' }}>
                  <div style={{ width: 56, flexShrink: 0 }} />
                  {HOURS.map(h => (
                    <div key={h} style={{ flex: 1, textAlign: 'center', padding: '0.3rem 0', fontSize: 9, color: 'var(--fg-3)', fontFamily: 'var(--font-mono, monospace)' }}>
                      {h}:00
                    </div>
                  ))}
                </div>
                {landscapeRows.map(({ label, date, appts }) => (
                  <div key={label} style={{ display: 'flex', height: 68, borderBottom: '1px solid var(--line)' }}>
                    <div style={{ width: 56, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--line)', gap: 2 }}>
                      <div style={{ fontSize: 8, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: label === 'Hoy' ? 'var(--led-soft)' : 'var(--fg-0)', lineHeight: 1 }}>{date.getDate()}</div>
                    </div>
                    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                      {HOURS.slice(1).map((_, i) => (
                        <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: `${(i + 1) / HOURS.length * 100}%`, width: 1, background: 'var(--line)', opacity: 0.3, pointerEvents: 'none' }} />
                      ))}
                      {appts.map(appt => {
                        const c = COLOR_MAP[appt.color]
                        const leftPct = Math.max(0, (appt.startH - DAY_START_H + appt.startM / 60) / HOURS.length * 100)
                        const widthPct = Math.max(2, (appt.durationMin / 60) / HOURS.length * 100)
                        const card = loyaltyCards?.get(appt.clientId)
                        const stampGoal = loyaltyConfig?.stampGoal ?? 10
                        return (
                          <div key={appt.id} onClick={() => setSelectedAppt(appt)} style={{
                            position: 'absolute', top: 4, bottom: 4,
                            left: `${leftPct}%`, width: `${widthPct}%`,
                            background: c.bg, border: `1px solid ${c.border}`,
                            borderRadius: 4, padding: '2px 4px',
                            cursor: 'pointer', overflow: 'hidden', zIndex: 4,
                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                          }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: c.text, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {appt.startH.toString().padStart(2,'0')}:{appt.startM.toString().padStart(2,'0')} {appt.client}
                            </div>
                            {card && (
                              <LoyaltyProgressBar points={card.points} target={stampGoal} accentVar="--led" />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
            <div style={{ maxHeight: 'calc(100dvh - 200px)', overflowY: 'auto', minWidth: 600 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-2)' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', position: 'relative' }}>
                <div>
                  {HOURS.map(h => (
                    <div key={h} style={{ height: CELL_HEIGHT_PX, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8, paddingTop: 4 }}>
                      <span style={{ fontSize: 10, color: 'var(--fg-3)', fontFamily: 'var(--font-mono, monospace)' }}>{h}:00</span>
                    </div>
                  ))}
                </div>

                {DAYS_ES.map((_, colIdx) => (
                  <div key={colIdx} style={{ borderLeft: '1px solid var(--line)', position: 'relative', minHeight: CELL_HEIGHT_PX * HOURS.length }}>
                    {HOURS.map(h => (
                      <div key={h} style={{ height: CELL_HEIGHT_PX, borderTop: '1px solid var(--line)', opacity: 0.4, boxSizing: 'border-box' }} />
                    ))}

                    {weekOffset === 0 && colIdx === todayCols && (
                      <div
                        ref={nowLineRef}
                        style={{
                          position: 'absolute', left: 0, right: 0, top: nowTop, height: 2,
                          background: 'var(--led)',
                          boxShadow: '0 0 0 1px rgba(255,255,255,0.55), 0 0 8px rgba(123,79,255,0.8)',
                          zIndex: 5, pointerEvents: 'none',
                        }}
                      >
                        <span style={{
                          position: 'absolute', left: 2, top: -18,
                          fontSize: 9, fontFamily: 'var(--font-ui)', color: 'var(--led)',
                          fontWeight: 600, letterSpacing: '0.04em', lineHeight: 1,
                          pointerEvents: 'none', whiteSpace: 'nowrap',
                        }}>
                          {now.getHours().toString().padStart(2, '0')}:{now.getMinutes().toString().padStart(2, '0')}
                        </span>
                      </div>
                    )}

                    {appointments.filter(a => a.day === colIdx).map(appt => {
                      const c = COLOR_MAP[appt.color]
                      const card = loyaltyCards?.get(appt.clientId)
                      const stampGoal = loyaltyConfig?.stampGoal ?? 10
                      const blockH = Math.max(heightPx(appt.durationMin), 24)
                      return (
                        <div
                          key={appt.id}
                          onClick={() => setSelectedAppt(appt)}
                          style={{
                            position: 'absolute', left: 3, right: 3,
                            top: topPx(appt.startH, appt.startM),
                            height: blockH,
                            background: c.bg, border: `1px solid ${c.border}`,
                            borderRadius: 6, padding: '3px 6px',
                            cursor: 'pointer', overflow: 'hidden', zIndex: 4,
                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: c.text, fontFamily: 'var(--font-ui)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {appt.client}
                            </div>
                            {blockH > 30 && (
                              <div style={{ fontSize: 9, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {appt.service}
                              </div>
                            )}
                          </div>
                          {card && blockH >= 32 && (
                            <LoyaltyProgressBar points={card.points} target={stampGoal} accentVar="--led" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
            </div>
          )}
        </div>

        {/* Right column */}
        {!isLandscape && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '1.25rem' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.12em', color: 'var(--fg-3)', marginBottom: '0.875rem' }}>
                HOY · PRÓXIMAS CITAS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {todayAppts.length === 0 && (
                  <div style={{ fontSize: 13, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)' }}>Sin más citas hoy</div>
                )}
                {todayAppts.slice(0, 5).map(a => (
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

            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 10, padding: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                <Icon name="calendar" size={13} />
                <span style={{ fontSize: 10, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Citas hoy</span>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--led)' }}>{todayAppts.length}</div>
            </div>
          </div>
        )}
      </div>

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
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: 13, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)' }}>Cliente</span>
              <button
                onClick={() => setProfileClientId(selectedAppt.clientId)}
                style={{ fontSize: 13, color: 'var(--led)', fontFamily: 'var(--font-ui)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: 2 }}
              >
                {selectedAppt.client}
              </button>
            </div>
            {[
              { label: 'Servicio', value: selectedAppt.service },
              { label: 'Hora', value: `${selectedAppt.startH.toString().padStart(2,'0')}:${selectedAppt.startM.toString().padStart(2,'0')}` },
              { label: 'Duración', value: `${selectedAppt.durationMin} min` },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: 13, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)' }}>{label}</span>
                <span style={{ fontSize: 13, color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontWeight: 500 }}>{value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setRescheduleAppt(selectedAppt)}
                  style={{ flex: 1, padding: '0.75rem', minHeight: 44, borderRadius: 8, border: 'none', background: 'var(--led)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: 'var(--glow-led)' }}
                >
                  Reprogramar
                </button>
                <button
                  onClick={() => setSelectedAppt(null)}
                  style={{ flex: 1, padding: '0.75rem', minHeight: 44, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-1)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}
                >
                  Cerrar
                </button>
              </div>
              {selectedApptFull && new Date(selectedApptFull.endTime) < now && (
                <button
                  disabled={cancelWithDeduction.isPending}
                  onClick={() => {
                    if (!selectedApptFull) return
                    cancelWithDeduction.mutate(
                      { id: selectedApptFull.id, endTime: selectedApptFull.endTime, clientId: selectedApptFull.clientId },
                      { onSuccess: () => setSelectedAppt(null) },
                    )
                  }}
                  style={{ width: '100%', padding: '0.75rem', minHeight: 44, borderRadius: 8, border: '1px solid var(--brick-warm)', background: 'rgba(139,58,31,0.12)', color: 'var(--brick-warm)', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: cancelWithDeduction.isPending ? 0.6 : 1 }}
                >
                  Cancelar (no vino)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {rescheduleAppt && (
        <RescheduleModal
          appt={rescheduleAppt}
          weekStart={weekStart}
          schedule={schedule}
          onClose={() => setRescheduleAppt(null)}
          onConfirm={handleRescheduleConfirm}
        />
      )}

      {profileClientId && (() => {
        const name = dbAppointments.find(a => a.clientId === profileClientId)?.clientName ?? profileClientId.slice(0, 8)
        return (
          <ClientProfileModal
            clientId={profileClientId}
            clientName={name}
            onClose={() => setProfileClientId(null)}
          />
        )
      })()}
    </>
  )
}

const navBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 32, height: 32, borderRadius: 6,
  border: '1px solid var(--line)', background: 'transparent',
  color: 'var(--fg-2)', cursor: 'pointer',
}
