import { useState, useMemo, useEffect, useRef, useSyncExternalStore } from 'react'
import { Helmet } from 'react-helmet-async'
import { useShopContext } from '@/context/ShopContext'
import { Icon } from '@/components/ui'
import { AgendaListView, NewAppointmentModal, RescheduleModal } from '@/components/admin'
import type { WeekAppt, RescheduleUpdate, NewAppointmentData } from '@/components/admin'
import { useBarbers } from '@/hooks/useBarbers'
import { useAllServices } from '@/hooks/useServices'
import { useAllAppointments, useCreateAppointment, useUpdateAppointment, useFindProfileByEmail } from '@/hooks/useAppointments'
import { useWeeklySchedule } from '@/hooks/useSchedule'
import { DEFAULT_WEEKLY_SCHEDULE } from '@/domain/schedule'

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
const HOURS = Array.from({ length: 11 }, (_, i) => i + 9) // 9 → 19

const APPT_COLORS = ['led', 'brick', 'gold'] as const

const COLOR_MAP = {
  led:   { bg: 'rgba(123,79,255,0.18)',  border: 'var(--led)',       text: 'var(--led-soft)' },
  brick: { bg: 'rgba(139,58,31,0.2)',    border: 'var(--brick-warm)', text: 'var(--brick-warm)' },
  gold:  { bg: 'rgba(201,162,74,0.15)', border: 'var(--gold)',       text: 'var(--gold)' },
}

const CELL_HEIGHT_PX = 56
const DAY_START_H = 9
const MAX_TOP_PX = CELL_HEIGHT_PX * (HOURS.length - 1) // clamp now-line to last visible row

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

function combineDateSlot(date: Date, slot: string): Date {
  const [h, m] = slot.split(':').map(Number)
  const result = new Date(date)
  result.setHours(h, m, 0, 0)
  return result
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

export default function DashboardPage() {
  const isLandscape = useLandscape()
  const { name: shopName } = useShopContext()
  const { data: barbers = [] } = useBarbers()
  const { data: services = [] } = useAllServices()
  const { data: dbAppointments = [] } = useAllAppointments()
  const { data: schedule = DEFAULT_WEEKLY_SCHEDULE } = useWeeklySchedule()
  const createApptMut = useCreateAppointment()
  const updateApptMut = useUpdateAppointment()
  const findProfileByEmail = useFindProfileByEmail()
  const activeBarbers = barbers.filter(b => b.isActive)
  const [weekOffset, setWeekOffset] = useState(0)
  const [dayOffset, setDayOffset] = useState(0)
  const [selectedAppt, setSelectedAppt] = useState<WeekAppt | null>(null)
  const [rescheduleAppt, setRescheduleAppt] = useState<WeekAppt | null>(null)
  const [newApptOpen, setNewApptOpen] = useState(false)
  const [newApptToast, setNewApptToast] = useState(false)
  const [rescheduleToast, setRescheduleToast] = useState(false)
  const [apptError, setApptError] = useState<string | null>(null)
  const nowLineRef = useRef<HTMLDivElement>(null)

  const weekStart = useMemo(() => {
    const ws = getWeekStart(new Date())
    ws.setDate(ws.getDate() + weekOffset * 7)
    return ws
  }, [weekOffset])

  const appointments = useMemo<WeekAppt[]>(() => {
    return dbAppointments
      .filter(a => a.status !== 'cancelled' && a.status !== 'no_show')
      .flatMap((a, i) => {
        const start = new Date(a.startTime)
        const end = new Date(a.endTime)
        const dayDiff = Math.round((start.getTime() - weekStart.getTime()) / 86_400_000)
        if (dayDiff < 0 || dayDiff > 6) return []
        const svc = services.find(s => s.id === a.serviceId)
        const barberIdx = barbers.findIndex(b => b.id === a.barberId)
        return [{
          id: a.id,
          day: dayDiff,
          startH: start.getHours(),
          startM: start.getMinutes(),
          durationMin: Math.round((end.getTime() - start.getTime()) / 60_000),
          client: a.clientName ?? `Cliente ${a.clientId.slice(0, 6)}`,
          service: svc?.name ?? 'Servicio',
          barberId: a.barberId,
          color: APPT_COLORS[barberIdx >= 0 ? barberIdx % 3 : i % 3],
        } satisfies WeekAppt]
      })
  }, [dbAppointments, weekStart, services, barbers])

  const handleNewApptConfirm = async (data: NewAppointmentData) => {
    setApptError(null)
    const svc = services.find(s => s.id === data.serviceId)
    if (!svc) return

    const startDt = combineDateSlot(data.date, data.slot)
    const endDt = addMinutes(startDt, svc.durationMinutes)

    let resolvedBarberId = data.barberId
    if (data.barberId === '__any__') {
      const available = activeBarbers.filter(b =>
        !dbAppointments.some(a =>
          a.barberId === b.id &&
          new Date(a.startTime) < endDt &&
          new Date(a.endTime) > startDt,
        ),
      )
      if (available.length === 0) {
        setApptError('No hay barberos disponibles para ese horario.')
        return
      }
      resolvedBarberId = available[Math.floor(Math.random() * available.length)].id
    }

    const profile = await findProfileByEmail(data.email).catch(() => null)
    if (!profile) {
      setApptError('No se encontró ningún cliente con ese email.')
      return
    }

    createApptMut.mutate(
      {
        clientId: profile.id,
        barberId: resolvedBarberId,
        serviceId: data.serviceId,
        startTime: startDt.toISOString(),
        endTime: endDt.toISOString(),
      },
      {
        onSuccess: () => {
          setNewApptOpen(false)
          setApptError(null)
          setNewApptToast(true)
          setTimeout(() => setNewApptToast(false), 3000)
        },
        onError: (e) => {
          if (import.meta.env.DEV) console.error(e)
          setApptError('No se pudo crear la cita. Inténtalo de nuevo.')
        },
      },
    )
  }

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

  // Mobile: current day column (0=Mon, capped at 0-6 for full week)
  const mobileDayCol = Math.max(0, Math.min(6, todayCols + dayOffset))
  const mobileDayDate = new Date(getWeekStart(new Date()))
  mobileDayDate.setDate(mobileDayDate.getDate() + mobileDayCol)

  const metrics = [
    { label: 'Citas hoy', value: appointments.filter(a => a.day === todayCols).length, icon: 'calendar' as const, color: 'var(--led)' },
    { label: 'Ingresos est.', value: '214€', icon: 'euro' as const, color: 'var(--gold)' },
    { label: 'Barberos activos', value: activeBarbers.length, icon: 'users' as const, color: 'var(--brick-warm)' },
    { label: 'Lista de espera', value: 3, icon: 'clock' as const, color: 'var(--fg-2)' },
  ]

  const upcomingToday = appointments.filter(a => a.day === todayCols)
    .sort((a, b) => a.startH * 60 + a.startM - (b.startH * 60 + b.startM))

  const landscapeRows = useMemo(() => {
    const todayDate = new Date()
    todayDate.setHours(0, 0, 0, 0)
    const tomorrowDate = new Date(todayDate)
    tomorrowDate.setDate(tomorrowDate.getDate() + 1)
    const todayStr = todayDate.toISOString().slice(0, 10)
    const tomorrowStr = tomorrowDate.toISOString().slice(0, 10)
    const base = dbAppointments.filter(a => a.status !== 'cancelled' && a.status !== 'no_show')
    const mapAppts = (dateStr: string): WeekAppt[] =>
      base
        .filter(a => new Date(a.startTime).toISOString().slice(0, 10) === dateStr)
        .map((a, i) => {
          const start = new Date(a.startTime)
          const end = new Date(a.endTime)
          const svc = services.find(s => s.id === a.serviceId)
          const barberIdx = barbers.findIndex(b => b.id === a.barberId)
          return {
            id: a.id, day: 0,
            startH: start.getHours(), startM: start.getMinutes(),
            durationMin: Math.round((end.getTime() - start.getTime()) / 60_000),
            client: a.clientName ?? `Cliente ${a.clientId.slice(0, 6)}`,
            service: svc?.name ?? 'Servicio',
            barberId: a.barberId,
            color: APPT_COLORS[barberIdx >= 0 ? barberIdx % 3 : i % 3],
          } satisfies WeekAppt
        })
    return [
      { label: 'Hoy',    date: todayDate,    appts: mapAppts(todayStr) },
      { label: 'Mañana', date: tomorrowDate, appts: mapAppts(tomorrowStr) },
    ]
  }, [dbAppointments, services, barbers])

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

      {rescheduleToast && (
        <div
          className="fixed top-[72px] right-3 z-[200] md:top-6 md:right-6"
          style={{ background: 'var(--ok)', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 8, fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, boxShadow: 'var(--shadow-md)' }}
        >
          ✓ Cita reprogramada correctamente
        </div>
      )}

      {/* Mobile-only: day agenda first, then metrics (hidden in landscape — desktop calendar shows instead) */}
      <div className={`md:hidden flex flex-col gap-4 mb-4${isLandscape ? ' hidden' : ''}`}>
        {/* Day agenda — first */}
        <AgendaListView
          items={appointments.filter(a => a.day === mobileDayCol)}
          barbers={barbers.map(b => ({ id: b.id, name: b.fullName }))}
          date={mobileDayDate}
          onPrevDay={() => setDayOffset(o => Math.max(o - 1, -(todayCols)))}
          onNextDay={() => setDayOffset(o => Math.min(o + 1, 6 - todayCols))}
          onSelect={(item) => setSelectedAppt(appointments.find(a => a.id === item.id) ?? null)}
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
            {barbers.map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: 8, background: 'var(--bg-3)', border: '1px solid var(--line)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: b.isActive ? 'var(--led)' : 'var(--bg-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: b.isActive ? '#fff' : 'var(--fg-3)' }}>
                  {calcInitials(b.fullName)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)', fontWeight: 500 }}>{b.fullName}</div>
                  <div style={{ fontSize: 12, fontFamily: 'var(--font-ui)', color: 'var(--fg-2)' }}>{b.role ?? 'Barbero'}</div>
                </div>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: b.isActive ? 'var(--ok)' : 'var(--fg-3)',
                  boxShadow: b.isActive ? '0 0 6px var(--ok)' : 'none',
                }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop + landscape mobile: two-column layout */}
      <div className={`${isLandscape ? 'flex flex-col gap-4' : 'hidden md:grid md:grid-cols-[1fr_360px]'} gap-6 items-start`}>

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

          {/* Grid body */}
          {isLandscape ? (
            /* Landscape mobile: 2 days (today + tomorrow), hours on X axis */
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: 560 }}>
                {/* Hour header row */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'var(--bg-2)' }}>
                  <div style={{ width: 56, flexShrink: 0 }} />
                  {HOURS.map(h => (
                    <div key={h} style={{ flex: 1, textAlign: 'center', padding: '0.3rem 0', fontSize: 9, color: 'var(--fg-3)', fontFamily: 'var(--font-mono, monospace)' }}>
                      {h}:00
                    </div>
                  ))}
                </div>
                {/* Day rows */}
                {landscapeRows.map(({ label, date, appts }) => (
                  <div key={label} style={{ display: 'flex', height: 68, borderBottom: '1px solid var(--line)' }}>
                    <div style={{ width: 56, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--line)', gap: 2 }}>
                      <div style={{ fontSize: 8, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: label === 'Hoy' ? 'var(--led-soft)' : 'var(--fg-0)', lineHeight: 1 }}>{date.getDate()}</div>
                    </div>
                    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                      {/* Vertical hour grid lines */}
                      {HOURS.slice(1).map((_, i) => (
                        <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: `${(i + 1) / HOURS.length * 100}%`, width: 1, background: 'var(--line)', opacity: 0.3, pointerEvents: 'none' }} />
                      ))}
                      {/* Appointments */}
                      {appts.map(appt => {
                        const c = COLOR_MAP[appt.color]
                        const leftPct = Math.max(0, (appt.startH - DAY_START_H + appt.startM / 60) / HOURS.length * 100)
                        const widthPct = Math.max(2, (appt.durationMin / 60) / HOURS.length * 100)
                        return (
                          <div key={appt.id} onClick={() => setSelectedAppt(appt)} style={{
                            position: 'absolute', top: 4, bottom: 4,
                            left: `${leftPct}%`, width: `${widthPct}%`,
                            background: c.bg, border: `1px solid ${c.border}`,
                            borderRadius: 4, padding: '2px 4px',
                            cursor: 'pointer', overflow: 'hidden', zIndex: 4,
                          }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: c.text, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {appt.startH.toString().padStart(2,'0')}:{appt.startM.toString().padStart(2,'0')} {appt.client}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Portrait/desktop: 7-day grid */
            <div style={{ overflowX: 'auto' }}>
            <div style={{ maxHeight: 'calc(100dvh - 200px)', overflowY: 'auto', minWidth: 600 }}>
              {/* Day headers */}
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
                      <div key={h} style={{ height: CELL_HEIGHT_PX, borderTop: '1px solid var(--line)', opacity: 0.4, boxSizing: 'border-box' }} />
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
                          boxShadow: '0 0 0 1px rgba(255,255,255,0.55), 0 0 8px rgba(123,79,255,0.8)',
                          zIndex: 5,
                          pointerEvents: 'none',
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
                      return (
                        <div
                          key={appt.id}
                          onClick={() => setSelectedAppt(appt)}
                          style={{
                            position: 'absolute', left: 3, right: 3,
                            top: topPx(appt.startH, appt.startM),
                            height: Math.max(heightPx(appt.durationMin), 24),
                            background: c.bg, border: `1px solid ${c.border}`,
                            borderRadius: 6, padding: '3px 6px',
                            cursor: 'pointer', overflow: 'hidden', zIndex: 4,
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
          )}
        </div>

        {/* Right column — hidden in landscape to keep the grid in full view */}
        {!isLandscape && <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
              {barbers.map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem', borderRadius: 8, background: 'var(--bg-3)', border: '1px solid var(--line)' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: b.isActive ? 'var(--led)' : 'var(--bg-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: b.isActive ? '#fff' : 'var(--fg-3)' }}>
                    {calcInitials(b.fullName)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)', fontWeight: 500 }}>{b.fullName}</div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--fg-2)' }}>{b.role ?? 'Barbero'}</div>
                  </div>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: b.isActive ? 'var(--ok)' : 'var(--fg-3)',
                    boxShadow: b.isActive ? '0 0 6px var(--ok)' : 'none',
                  }} />
                </div>
              ))}
            </div>
          </div>
        </div>}
      </div>

      {/* New appointment modal */}
      {newApptOpen && (
        <NewAppointmentModal
          onClose={() => { setNewApptOpen(false); setApptError(null) }}
          onConfirm={handleNewApptConfirm}
          schedule={schedule}
          errorMessage={apptError ?? undefined}
          isPending={createApptMut.isPending}
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
              { label: 'Barbero', value: barbers.find(b => b.id === selectedAppt.barberId)?.fullName ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: 13, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)' }}>{label}</span>
                <span style={{ fontSize: 13, color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontWeight: 500 }}>{value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
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
    </>
  )
}

function calcInitials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?'
}

const navBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 32, height: 32, borderRadius: 6,
  border: '1px solid var(--line)', background: 'transparent',
  color: 'var(--fg-2)', cursor: 'pointer',
}
