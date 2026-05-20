import { useState, useMemo, useEffect, useRef, useSyncExternalStore } from 'react'
import { Helmet } from 'react-helmet-async'
import { useShopContext } from '@/context/ShopContext'
import { Icon } from '@/components/ui'
import { AgendaListView, RescheduleModal, ClientProfileModal, AppointmentLoyaltyControls } from '@/components/admin'
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
    () => barbers.find(b => b.email != null && user?.email != null &&
      b.email.toLowerCase().trim() === user.email.toLowerCase().trim()) ?? null,
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
  const [calView, setCalView] = useState<'week' | 'month'>('week')
  const [monthViewYear, setMonthViewYear] = useState(() => new Date().getFullYear())
  const [monthViewMonth, setMonthViewMonth] = useState(() => new Date().getMonth())
  const [selectedMonthDay, setSelectedMonthDay] = useState<Date | null>(null)
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
        const dayDiff = Math.floor((start.getTime() - weekStart.getTime()) / 86_400_000)
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

  const monthDayApptsMap = useMemo(() => {
    const map = new Map<string, WeekAppt[]>()
    dbAppointments
      .filter(a => a.status !== 'cancelled' && a.status !== 'no_show')
      .forEach(a => {
        const d = new Date(a.startTime)
        if (d.getFullYear() !== monthViewYear || d.getMonth() !== monthViewMonth) return
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        const svc = services.find(s => s.id === a.serviceId)
        const appt: WeekAppt = {
          id: a.id, day: 0,
          startH: d.getHours(), startM: d.getMinutes(),
          durationMin: Math.round((new Date(a.endTime).getTime() - d.getTime()) / 60_000),
          client: a.clientName ?? `Cliente ${a.clientId.slice(0, 6)}`,
          clientId: a.clientId,
          service: svc?.name ?? 'Servicio',
          barberId: a.barberId,
          color: 'led' as const,
        }
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(appt)
      })
    return map
  }, [dbAppointments, services, monthViewYear, monthViewMonth])

  const monthViewDayAppts = useMemo(() => {
    if (!selectedMonthDay) return []
    const d = selectedMonthDay
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return monthDayApptsMap.get(key) ?? []
  }, [selectedMonthDay, monthDayApptsMap])

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
          <div style={{ borderBottom: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.75rem 1rem', flexWrap: 'wrap' }}>
              {/* Date navigation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flex: '0 0 auto' }}>
                <button onClick={() => calView === 'week' ? setWeekOffset(o => o - 1) : (() => { const d = new Date(monthViewYear, monthViewMonth - 1, 1); setMonthViewMonth(d.getMonth()); setMonthViewYear(d.getFullYear()) })()} style={navBtn}><Icon name="chevronL" size={13} /></button>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '0.04em', color: 'var(--fg-0)', minWidth: 130, textAlign: 'center' }}>
                  {calView === 'week'
                    ? (() => {
                        const end = new Date(weekStart); end.setDate(end.getDate() + 6)
                        return `${weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} — ${end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`
                      })()
                    : new Date(monthViewYear, monthViewMonth, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
                  }
                </span>
                <button onClick={() => calView === 'week' ? setWeekOffset(o => o + 1) : (() => { const d = new Date(monthViewYear, monthViewMonth + 1, 1); setMonthViewMonth(d.getMonth()); setMonthViewYear(d.getFullYear()) })()} style={navBtn}><Icon name="chevronR" size={13} /></button>
                <button onClick={() => { if (calView === 'week') setWeekOffset(0); else { const n = new Date(); setMonthViewMonth(n.getMonth()); setMonthViewYear(n.getFullYear()) } }} style={{ ...navBtn, padding: '0 0.625rem', fontSize: 11, fontFamily: 'var(--font-ui)', width: 'auto' }}>Hoy</button>
              </div>
              {/* View toggle */}
              <div style={{ marginLeft: 'auto', display: 'flex', borderRadius: 7, border: '1px solid var(--line)', overflow: 'hidden' }}>
                {(['week', 'month'] as const).map((v, i) => (
                  <button key={v} onClick={() => setCalView(v)} style={{
                    padding: '0.3rem 0.65rem', border: 'none', cursor: 'pointer', fontSize: 11,
                    fontFamily: 'var(--font-ui)', fontWeight: calView === v ? 600 : 400,
                    background: calView === v ? 'var(--led)' : 'transparent',
                    color: calView === v ? '#fff' : 'var(--fg-2)',
                    borderRight: i === 0 ? '1px solid var(--line)' : 'none',
                    transition: 'all 0.12s',
                  }}>
                    {v === 'week' ? 'Semana' : 'Mes'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Month view */}
          {calView === 'month' && !isLandscape && (() => {
            const first = new Date(monthViewYear, monthViewMonth, 1)
            const last = new Date(monthViewYear, monthViewMonth + 1, 0)
            const startDow = (first.getDay() + 6) % 7
            const cells: Array<number | null> = Array.from({ length: startDow }, () => null)
            for (let d = 1; d <= last.getDate(); d++) cells.push(d)
            while (cells.length % 7 !== 0) cells.push(null)
            const todayLocalStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
            const selLocalStr = selectedMonthDay
              ? `${selectedMonthDay.getFullYear()}-${String(selectedMonthDay.getMonth() + 1).padStart(2, '0')}-${String(selectedMonthDay.getDate()).padStart(2, '0')}`
              : null
            return (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--line)' }}>
                  {DAYS_ES.map((d, i) => (
                    <div key={d} style={{
                      textAlign: 'center', padding: '0.5rem 0',
                      fontSize: 10, fontFamily: 'var(--font-ui)', textTransform: 'uppercase',
                      letterSpacing: '0.1em', fontWeight: 600,
                      color: i >= 5 ? 'var(--gold)' : 'var(--fg-3)',
                      borderRight: i < 6 ? '1px solid var(--line)' : 'none',
                    }}>{d}</div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                  {cells.map((day, i) => {
                    const col = i % 7
                    const isWeekend = col >= 5
                    if (day === null) {
                      return (
                        <div key={`e${i}`} style={{
                          minHeight: 60,
                          borderRight: col < 6 ? '1px solid var(--line)' : 'none',
                          borderBottom: '1px solid var(--line)',
                          background: isWeekend ? 'rgba(255,255,255,0.01)' : 'transparent',
                        }} />
                      )
                    }
                    const dateStr = `${monthViewYear}-${String(monthViewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    const dayAppts = monthDayApptsMap.get(dateStr) ?? []
                    const isToday = dateStr === todayLocalStr
                    const isSelected = selLocalStr === dateStr
                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedMonthDay(isSelected ? null : new Date(monthViewYear, monthViewMonth, day))}
                        style={{
                          minHeight: 60, padding: '6px 8px 6px 6px',
                          border: 'none',
                          borderRight: col < 6 ? '1px solid var(--line)' : 'none',
                          borderBottom: '1px solid var(--line)',
                          background: isSelected ? 'rgba(123,79,255,0.12)' : isWeekend ? 'rgba(255,255,255,0.015)' : 'transparent',
                          boxShadow: isSelected ? 'inset 0 0 0 1.5px rgba(123,79,255,0.45)' : 'none',
                          cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
                          transition: 'background 0.1s',
                        }}
                      >
                        <div style={{
                          width: 26, height: 26, borderRadius: '50%',
                          background: isToday ? 'var(--led)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--font-display)',
                          fontSize: 13, fontWeight: isToday ? 700 : isSelected ? 600 : 400,
                          color: isToday ? '#fff' : isSelected ? 'var(--led-soft)' : isWeekend ? 'var(--fg-2)' : 'var(--fg-0)',
                          lineHeight: 1, flexShrink: 0,
                          boxShadow: 'none',
                        }}>
                          {day}
                        </div>
                        {dayAppts.length > 0 && (
                          <div style={{ marginTop: 'auto', paddingTop: 4, display: 'flex', alignItems: 'center', gap: 3, alignSelf: 'flex-start' }}>
                            {dayAppts.slice(0, 3).map((_, idx) => (
                              <div key={idx} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--led)', flexShrink: 0 }} />
                            ))}
                            {dayAppts.length > 3 && (
                              <span style={{ fontSize: 8, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', fontWeight: 600, lineHeight: 1 }}>+{dayAppts.length - 3}</span>
                            )}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
                {selectedMonthDay && (
                  <div style={{ borderTop: '1px solid var(--line)', padding: '0.875rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.12em', color: 'var(--fg-3)', textTransform: 'uppercase' }}>
                        {selectedMonthDay.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)' }}>
                        {monthViewDayAppts.length} {monthViewDayAppts.length === 1 ? 'cita' : 'citas'}
                      </span>
                    </div>
                    {monthViewDayAppts.length === 0 ? (
                      <div style={{ fontSize: 13, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', padding: '0.25rem 0' }}>Sin citas este día</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        {monthViewDayAppts
                          .slice()
                          .sort((a, b) => a.startH * 60 + a.startM - (b.startH * 60 + b.startM))
                          .map(a => {
                            const c = COLOR_MAP[a.color]
                            return (
                              <button key={a.id} onClick={() => setSelectedAppt(a)} style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.6rem 0.875rem 0.6rem 0.625rem',
                                borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                                background: 'var(--bg-3)', border: '1px solid var(--line)',
                                borderLeft: `3px solid ${c.border}`,
                              }}>
                                <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, color: c.text, minWidth: 36, fontWeight: 600 }}>
                                  {a.startH.toString().padStart(2, '0')}:{a.startM.toString().padStart(2, '0')}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontFamily: 'var(--font-ui)', fontWeight: 600, color: 'var(--fg-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.client}</div>
                                  <div style={{ fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--fg-3)' }}>{a.service} · {a.durationMin} min</div>
                                </div>
                              </button>
                            )
                          })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })()}

          {(calView === 'week' || isLandscape) && isLandscape ? (
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
                            background: 'var(--bg-3)',
                            borderTop: `2px solid ${c.border}`,
                            borderLeft: '1px solid var(--line)',
                            borderRight: '1px solid var(--line)',
                            borderBottom: '1px solid var(--line)',
                            borderRadius: '0 0 4px 4px',
                            padding: '2px 4px',
                            cursor: 'pointer', overflow: 'hidden', zIndex: 4,
                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                          }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--fg-0)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
          ) : calView === 'week' ? (
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
                            background: 'var(--bg-3)',
                            borderLeft: `3px solid ${c.border}`,
                            borderTop: '1px solid var(--line)',
                            borderRight: '1px solid var(--line)',
                            borderBottom: '1px solid var(--line)',
                            borderRadius: '0 5px 5px 0',
                            padding: '2px 5px 2px 6px',
                            cursor: 'pointer', overflow: 'hidden', zIndex: 4,
                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                            transition: 'background 0.1s',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 9, fontFamily: 'var(--font-mono, monospace)', color: c.text, fontWeight: 600, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {appt.startH.toString().padStart(2,'0')}:{appt.startM.toString().padStart(2,'0')}
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {appt.client}
                            </div>
                            {blockH > 38 && (
                              <div style={{ fontSize: 9, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {appt.service}
                              </div>
                            )}
                          </div>
                          {card && blockH >= 42 && (
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
          ) : null}
        </div>

        {/* Right column */}
        {!isLandscape && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
              <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 10, padding: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                  <Icon name="calendar" size={12} />
                  <span style={{ fontSize: 9, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Citas hoy</span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--led)', lineHeight: 1 }}>{todayAppts.length}</div>
              </div>
              <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 10, padding: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                  <Icon name="clock" size={12} />
                  <span style={{ fontSize: 9, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Esta semana</span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--fg-1)', lineHeight: 1 }}>{appointments.length}</div>
              </div>
            </div>

            {/* Today's appointments */}
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '0.875rem 1rem 0.625rem', borderBottom: todayAppts.length > 0 ? '1px solid var(--line)' : undefined }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.14em', color: 'var(--fg-3)' }}>HOY · PRÓXIMAS CITAS</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {todayAppts.length === 0 ? (
                  <div style={{ padding: '0.875rem 1rem', fontSize: 13, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)' }}>Sin más citas hoy</div>
                ) : (
                  todayAppts.slice(0, 5).map((a, i) => (
                    <button key={a.id} onClick={() => setSelectedAppt(a)} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.6rem 1rem', cursor: 'pointer', textAlign: 'left',
                      borderBottom: i < Math.min(todayAppts.length, 5) - 1 ? '1px solid var(--line)' : 'none',
                      background: 'transparent', border: 'none',
                    }}>
                      <div style={{ width: 3, height: 32, borderRadius: 2, flexShrink: 0, background: 'var(--led)' }} />
                      <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, color: 'var(--fg-0)', minWidth: 38, fontWeight: 600 }}>
                        {`${a.startH.toString().padStart(2,'0')}:${a.startM.toString().padStart(2,'0')}`}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.client}</div>
                        <div style={{ fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--fg-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.service}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Appointment detail modal */}
      {selectedAppt && (() => {
        const c = COLOR_MAP[selectedAppt.color]
        const isPast = selectedApptFull ? new Date(selectedApptFull.endTime) < now : false
        return (
          <div onClick={() => setSelectedAppt(null)} style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-2)', borderRadius: 16, width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-lg)', border: '1px solid var(--line)', overflow: 'hidden' }}>
              <div style={{ height: 4, background: `linear-gradient(90deg, ${c.border} 0%, transparent 100%)` }} />

              {/* Header */}
              <div style={{ padding: '1.25rem 1.5rem 1rem', background: c.bg, borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.625rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: c.text, lineHeight: 1, letterSpacing: '-0.02em' }}>
                        {selectedAppt.startH.toString().padStart(2,'0')}:{selectedAppt.startM.toString().padStart(2,'0')}
                      </span>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--fg-3)' }}>{selectedAppt.durationMin} min</span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 700, color: 'var(--fg-0)', marginBottom: '0.375rem' }}>{selectedAppt.service}</div>
                    <button
                      onClick={() => setProfileClientId(selectedAppt.clientId)}
                      style={{ fontSize: 14, color: c.text, fontFamily: 'var(--font-ui)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                      {selectedAppt.client}
                    </button>
                  </div>
                  <button onClick={() => setSelectedAppt(null)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                {selectedApptFull && (
                  <div style={{ marginTop: '0.75rem', fontSize: 12, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
                    {new Date(selectedApptFull.startTime).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {isPast && <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--fg-4)', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4 }}>Pasada</span>}
                  </div>
                )}
              </div>

              {/* Loyalty controls */}
              {selectedApptFull && (
                <div style={{ padding: '0.875rem 1.25rem' }}>
                  <AppointmentLoyaltyControls
                    appointmentId={selectedApptFull.id}
                    clientId={selectedApptFull.clientId}
                    serviceId={selectedApptFull.serviceId}
                    endTime={selectedApptFull.endTime}
                  />
                </div>
              )}

              {/* Actions */}
              <div style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setRescheduleAppt(selectedAppt)} style={{ flex: 1, padding: '0.7rem', minHeight: 42, borderRadius: 8, border: 'none', background: 'var(--led)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Reprogramar
                  </button>
                  <button onClick={() => setSelectedAppt(null)} style={{ flex: 1, padding: '0.7rem', minHeight: 42, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-1)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}>
                    Cerrar
                  </button>
                </div>
                {isPast && (
                  <button
                    disabled={cancelWithDeduction.isPending}
                    onClick={() => {
                      if (!selectedApptFull) return
                      cancelWithDeduction.mutate(
                        { id: selectedApptFull.id, endTime: selectedApptFull.endTime, clientId: selectedApptFull.clientId },
                        { onSuccess: () => setSelectedAppt(null) },
                      )
                    }}
                    style={{ width: '100%', padding: '0.7rem', minHeight: 42, borderRadius: 8, border: '1px solid rgba(139,58,31,0.35)', background: 'rgba(139,58,31,0.08)', color: 'var(--brick-warm)', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: cancelWithDeduction.isPending ? 0.6 : 1 }}
                  >
                    Cancelar (no vino)
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

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
            hideMoney
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
