import { useState, useMemo, useEffect, useRef, useSyncExternalStore, useCallback } from 'react'
import { Helmet } from 'react-helmet-async'
import { useShopContext } from '@/context/ShopContext'
import { Icon } from '@/components/ui'
import { AgendaListView, NewAppointmentModal, RescheduleModal, ClientProfileModal, AppointmentLoyaltyControls } from '@/components/admin'
import type { WeekAppt, RescheduleUpdate, NewAppointmentData } from '@/components/admin'
import { useBarbers } from '@/hooks/useBarbers'
import { useAllServices } from '@/hooks/useServices'
import { useAllAppointments, useCreateAppointment, useUpdateAppointment, useFindProfileByEmail } from '@/hooks/useAppointments'
import { useWeeklySchedule } from '@/hooks/useSchedule'
import { DEFAULT_WEEKLY_SCHEDULE } from '@/domain/schedule'
import { useLoyaltyCardsForClients, useAutoAwardPoints, useCancelAppointmentWithDeduction } from '@/hooks/useLoyalty'
import { useLoyaltyConfig } from '@/hooks/useShopConfig'
import { LoyaltyProgressBar } from '@/components/loyalty'
import jsQR from 'jsqr'

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
  const { data: loyaltyConfig } = useLoyaltyConfig()

  const uniqueClientIds = useMemo(
    () => [...new Set(dbAppointments.map(a => a.clientId))],
    [dbAppointments],
  )
  const { data: loyaltyCards } = useLoyaltyCardsForClients(uniqueClientIds)
  useAutoAwardPoints(dbAppointments)
  const activeBarbers = barbers.filter(b => b.isActive)
  const [weekOffset, setWeekOffset] = useState(0)
  const [dayOffset, setDayOffset] = useState(0)
  const [selectedAppt, setSelectedAppt] = useState<WeekAppt | null>(null)
  const [rescheduleAppt, setRescheduleAppt] = useState<WeekAppt | null>(null)
  const [profileClientId, setProfileClientId] = useState<string | null>(null)
  const cancelWithDeduction = useCancelAppointmentWithDeduction()
  const [newApptOpen, setNewApptOpen] = useState(false)
  const [newApptToast, setNewApptToast] = useState(false)
  const [rescheduleToast, setRescheduleToast] = useState(false)
  const [apptError, setApptError] = useState<string | null>(null)
  const [calView, setCalView] = useState<'week' | 'month'>('week')
  const [monthViewYear, setMonthViewYear] = useState(() => new Date().getFullYear())
  const [monthViewMonth, setMonthViewMonth] = useState(() => new Date().getMonth())
  const [selectedMonthDay, setSelectedMonthDay] = useState<Date | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [qrScanOpen, setQrScanOpen] = useState(false)
  const [loyaltySearch, setLoyaltySearch] = useState('')
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
        const dayDiff = Math.floor((start.getTime() - weekStart.getTime()) / 86_400_000)
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
          clientId: a.clientId,
          service: svc?.name ?? 'Servicio',
          barberId: a.barberId,
          color: APPT_COLORS[barberIdx >= 0 ? barberIdx % 3 : i % 3],
        } satisfies WeekAppt]
      })
  }, [dbAppointments, weekStart, services, barbers])

  const filteredAppointments = useMemo(() => {
    if (!searchQuery.trim()) return appointments
    const q = searchQuery.toLowerCase()
    return appointments.filter(a =>
      a.client.toLowerCase().includes(q) || a.service.toLowerCase().includes(q),
    )
  }, [appointments, searchQuery])

  const loyaltySearchResults = useMemo(() => {
    if (!loyaltySearch.trim()) return []
    const q = loyaltySearch.toLowerCase()
    const seen = new Set<string>()
    const results: Array<{ clientId: string; name: string; memberCode: string; points: number }> = []
    for (const a of dbAppointments) {
      if (seen.has(a.clientId)) continue
      seen.add(a.clientId)
      const card = loyaltyCards?.get(a.clientId)
      const name = a.clientName ?? a.clientId.slice(0, 8)
      const memberCode = card?.memberCode ?? ''
      if (name.toLowerCase().includes(q) || memberCode.toLowerCase().includes(q)) {
        results.push({ clientId: a.clientId, name, memberCode, points: card?.points ?? 0 })
      }
      if (results.length >= 6) break
    }
    return results
  }, [loyaltySearch, dbAppointments, loyaltyCards])

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

  const selectedApptFull = useMemo(
    () => selectedAppt ? (dbAppointments.find(a => a.id === selectedAppt.id) ?? null) : null,
    [selectedAppt, dbAppointments],
  )

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

  const todayRevenue = useMemo(() => {
    const t = new Date()
    const todayStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
    return dbAppointments
      .filter(a => {
        if (a.status === 'cancelled' || a.status === 'no_show') return false
        const d = new Date(a.startTime)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === todayStr
      })
      .reduce((sum, a) => sum + (services.find(s => s.id === a.serviceId)?.price ?? 0), 0)
  }, [dbAppointments, services])

  const weekRevenue = useMemo(() => {
    return appointments.reduce((sum, a) => {
      const svc = services.find(s => s.name === a.service)
      return sum + (svc?.price ?? 0)
    }, 0)
  }, [appointments, services])

  const metrics = [
    { label: 'Citas hoy', value: appointments.filter(a => a.day === todayCols).length, icon: 'calendar' as const, color: 'var(--led)' },
    { label: 'Ingresos hoy', value: `${todayRevenue}€`, icon: 'euro' as const, color: 'var(--gold)' },
    { label: 'Barberos', value: activeBarbers.length, icon: 'users' as const, color: 'var(--brick-warm)' },
    { label: 'Esta semana', value: `${weekRevenue}€`, icon: 'clock' as const, color: 'var(--led-soft)' },
  ]

  const monthDayApptsMap = useMemo(() => {
    const map = new Map<string, WeekAppt[]>()
    dbAppointments
      .filter(a => a.status !== 'cancelled' && a.status !== 'no_show')
      .forEach((a, i) => {
        const d = new Date(a.startTime)
        if (d.getFullYear() !== monthViewYear || d.getMonth() !== monthViewMonth) return
        // Use local date components to avoid UTC offset shifting the date
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        const svc = services.find(s => s.id === a.serviceId)
        const barberIdx = barbers.findIndex(b => b.id === a.barberId)
        const appt: WeekAppt = {
          id: a.id, day: 0,
          startH: d.getHours(), startM: d.getMinutes(),
          durationMin: Math.round((new Date(a.endTime).getTime() - d.getTime()) / 60_000),
          client: a.clientName ?? `Cliente ${a.clientId.slice(0, 6)}`,
          clientId: a.clientId,
          service: svc?.name ?? 'Servicio',
          barberId: a.barberId,
          color: APPT_COLORS[barberIdx >= 0 ? barberIdx % 3 : i % 3],
        }
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(appt)
      })
    return map
  }, [dbAppointments, services, barbers, monthViewYear, monthViewMonth])

  const monthViewDayAppts = useMemo(() => {
    if (!selectedMonthDay) return []
    const d = selectedMonthDay
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return monthDayApptsMap.get(key) ?? []
  }, [selectedMonthDay, monthDayApptsMap])

  const nowMins = now.getHours() * 60 + now.getMinutes()
  const upcomingToday = appointments
    .filter(a => a.day === todayCols && (weekOffset !== 0 || a.startH * 60 + a.startM >= nowMins))
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
            clientId: a.clientId,
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
            cursor: 'pointer',
          }}
        >
          <Icon name="plus" size={16} />
          Nueva cita
        </button>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-3">
          {metrics.map(m => (
            <div key={m.label} style={{
              background: 'var(--bg-2)', border: '1px solid var(--line)',
              borderLeft: `3px solid ${m.color}`,
              borderRadius: 10, padding: '0.875rem 1rem',
              display: 'flex', flexDirection: 'column', gap: '0.45rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, whiteSpace: 'nowrap' }}>{m.label}</span>
                <div style={{ color: m.color }}><Icon name={m.icon} size={15} /></div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: m.color, lineHeight: 1, letterSpacing: '-0.03em' }}>{m.value}</div>
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
          {/* Header toolbar */}
          <div style={{ borderBottom: '1px solid var(--line)' }}>
            {/* Row 1: navigation + actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', flexWrap: 'wrap' }}>
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

              {/* Search */}
              <div style={{ flex: 1, position: 'relative', minWidth: 180 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input
                  type="text"
                  placeholder="Buscar cliente o servicio..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%', paddingLeft: 30, paddingRight: 10, height: 34,
                    borderRadius: 7, border: '1px solid var(--line)', background: 'var(--bg-3)',
                    color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 12,
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* View toggle + new appt */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '0 0 auto' }}>
                <div style={{ display: 'flex', borderRadius: 7, border: '1px solid var(--line)', overflow: 'hidden' }}>
                  {(['week', 'month'] as const).map((v, i) => (
                    <button key={v} onClick={() => setCalView(v)} style={{
                      padding: '0.3rem 0.75rem', border: 'none', cursor: 'pointer', fontSize: 12,
                      fontFamily: 'var(--font-ui)', fontWeight: calView === v ? 700 : 400,
                      background: calView === v ? 'var(--led)' : 'transparent',
                      color: calView === v ? '#fff' : 'var(--fg-2)',
                      borderRight: i === 0 ? '1px solid var(--line)' : 'none',
                      transition: 'all 0.12s',
                    }}>
                      {v === 'week' ? 'Semana' : 'Mes'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setNewApptOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.5rem 1.125rem', height: 36,
                    borderRadius: 8, border: 'none',
                    background: 'var(--led)', color: '#fff',
                    fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap', letterSpacing: '0.01em',
                  }}
                >
                  <Icon name="plus" size={14} />
                  Nueva cita
                </button>
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
            // pad to full weeks
            while (cells.length % 7 !== 0) cells.push(null)
            const todayLocalStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
            const selLocalStr = selectedMonthDay
              ? `${selectedMonthDay.getFullYear()}-${String(selectedMonthDay.getMonth() + 1).padStart(2, '0')}-${String(selectedMonthDay.getDate()).padStart(2, '0')}`
              : null
            return (
              <div>
                {/* Day-of-week header */}
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
                {/* Calendar grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                  {cells.map((day, i) => {
                    const col = i % 7
                    const isWeekend = col >= 5
                    if (day === null) {
                      return (
                        <div key={`e${i}`} style={{
                          minHeight: 64,
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
                          minHeight: 64, padding: '6px 8px 6px 6px',
                          border: 'none',
                          borderRight: col < 6 ? '1px solid var(--line)' : 'none',
                          borderBottom: '1px solid var(--line)',
                          background: isSelected
                            ? 'rgba(123,79,255,0.12)'
                            : isWeekend ? 'rgba(255,255,255,0.015)' : 'transparent',
                          boxShadow: isSelected ? 'inset 0 0 0 1.5px rgba(123,79,255,0.45)' : 'none',
                          cursor: 'pointer', textAlign: 'right',
                          display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
                          transition: 'background 0.1s',
                        }}
                      >
                        {/* Day number — circle for today */}
                        <div style={{
                          width: 26, height: 26,
                          borderRadius: '50%',
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
                        {/* Appointment indicators */}
                        {dayAppts.length > 0 && (
                          <div style={{ marginTop: 'auto', paddingTop: 4, display: 'flex', alignItems: 'center', gap: 3, alignSelf: 'flex-start' }}>
                            {dayAppts.slice(0, 3).map((a, idx) => (
                              <div key={idx} style={{ width: 6, height: 6, borderRadius: '50%', background: COLOR_MAP[a.color].border, flexShrink: 0 }} />
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
                {/* Selected day appointments */}
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
                            const svcFull = services.find(s => s.name === a.service)
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
                                  <div style={{ fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--fg-3)' }}>{a.service} · {a.durationMin} min{svcFull ? ` · ${svcFull.price}€` : ''}</div>
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

          {/* Grid body (week view) */}
          {(calView === 'week' || isLandscape) && isLandscape ? (
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
                              <LoyaltyProgressBar
                                points={card.points}
                                target={stampGoal}
                                accentVar={appt.color === 'gold' ? '--gold' : appt.color === 'brick' ? '--brick-warm' : '--led'}
                              />
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

                    {filteredAppointments.filter(a => a.day === colIdx).map(appt => {
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
                            <LoyaltyProgressBar
                              points={card.points}
                              target={stampGoal}
                              accentVar={appt.color === 'gold' ? '--gold' : appt.color === 'brick' ? '--brick-warm' : '--led'}
                            />
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

        {/* Right column — hidden in landscape */}
        {!isLandscape && <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
            {metrics.map(m => (
              <div key={m.label} style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--line)',
                borderLeft: `3px solid ${m.color}`,
                borderRadius: 10,
                padding: '0.875rem 1rem',
                display: 'flex', flexDirection: 'column', gap: '0.5rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {m.label}
                  </span>
                  <div style={{ color: m.color, flexShrink: 0 }}>
                    <Icon name={m.icon} size={15} />
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, color: m.color, lineHeight: 1, letterSpacing: '-0.03em' }}>
                  {m.value}
                </div>
              </div>
            ))}
          </div>

          {/* Today's upcoming appointments */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '0.875rem 1rem 0.625rem', borderBottom: upcomingToday.length > 0 ? '1px solid var(--line)' : undefined }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.14em', color: 'var(--fg-3)' }}>
                HOY · PRÓXIMAS CITAS
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {upcomingToday.length === 0 ? (
                <div style={{ padding: '0.875rem 1rem', fontSize: 13, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)' }}>Sin más citas hoy</div>
              ) : (
                upcomingToday.slice(0, 5).map((a, i) => {
                  const c = COLOR_MAP[a.color]
                  return (
                    <button key={a.id} onClick={() => setSelectedAppt(a)} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.6rem 1rem', cursor: 'pointer',
                      borderBottom: i < Math.min(upcomingToday.length, 5) - 1 ? '1px solid var(--line)' : 'none',
                      background: 'transparent', border: 'none', textAlign: 'left',
                      transition: 'background 0.1s',
                    }}>
                      <div style={{ width: 3, height: 32, borderRadius: 2, flexShrink: 0, background: c.border }} />
                      <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, color: 'var(--fg-0)', minWidth: 38, fontWeight: 600 }}>
                        {`${a.startH.toString().padStart(2,'0')}:${a.startM.toString().padStart(2,'0')}`}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.client}</div>
                        <div style={{ fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--fg-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.service}</div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Barbers */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '0.875rem 1rem 0.625rem', borderBottom: '1px solid var(--line)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.14em', color: 'var(--fg-3)' }}>BARBEROS</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {barbers.map((b, i) => {
                const todayApptCount = appointments.filter(a => a.day === todayCols && a.barberId === b.id).length
                return (
                  <div key={b.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.625rem 1rem',
                    borderBottom: i < barbers.length - 1 ? '1px solid var(--line)' : 'none',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: b.isActive ? 'rgba(123,79,255,0.22)' : 'var(--bg-4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 11, color: b.isActive ? 'var(--led-soft)' : 'var(--fg-3)',
                    }}>
                      {calcInitials(b.fullName)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.fullName}</div>
                      <div style={{ fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--fg-3)' }}>
                        {b.isActive ? `${todayApptCount} citas hoy` : 'Inactivo'}
                      </div>
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: b.isActive ? 'var(--ok)' : 'var(--fg-4)', boxShadow: b.isActive ? '0 0 6px var(--ok)' : 'none' }} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Loyalty card search */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '0.875rem 1rem 0.625rem', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.14em', color: 'var(--fg-3)' }}>FIDELIZACIÓN</div>
              <button onClick={() => setQrScanOpen(true)} title="Escanear QR" style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/><rect x="3" y="16" width="5" height="5" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
              </button>
            </div>
            <div style={{ padding: '0.625rem 0.75rem' }}>
              {/* Search input */}
              <div style={{ position: 'relative', marginBottom: loyaltySearchResults.length > 0 ? '0.5rem' : 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input
                  type="text"
                  placeholder="Nombre o código de tarjeta..."
                  value={loyaltySearch}
                  onChange={e => setLoyaltySearch(e.target.value)}
                  style={{
                    width: '100%', paddingLeft: 28, paddingRight: 8, height: 32,
                    borderRadius: 7, border: '1px solid var(--line)', background: 'var(--bg-3)',
                    color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 12,
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              {/* Results */}
              {loyaltySearch.trim() && loyaltySearchResults.length === 0 && (
                <div style={{ padding: '0.5rem 0.25rem', fontSize: 12, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)' }}>Sin resultados</div>
              )}
              {loyaltySearchResults.map(r => (
                <button
                  key={r.clientId}
                  onClick={() => { setProfileClientId(r.clientId); setLoyaltySearch('') }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.625rem',
                    padding: '0.5rem 0.5rem', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                    background: 'transparent', border: 'none', marginBottom: 2,
                    transition: 'background 0.1s',
                  }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: 'rgba(123,79,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--led-soft)' }}>
                    {calcInitials(r.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: 1 }}>
                      <span style={{ fontSize: 9, fontFamily: 'var(--font-mono, monospace)', color: 'var(--fg-3)', letterSpacing: '0.06em' }}>{r.memberCode || '—'}</span>
                      <span style={{ fontSize: 9, color: 'var(--gold)', fontFamily: 'var(--font-ui)', fontWeight: 600 }}>{r.points} pts</span>
                    </div>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-3)" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
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
      {selectedAppt && (() => {
        const c = COLOR_MAP[selectedAppt.color]
        const barberName = barbers.find(b => b.id === selectedAppt.barberId)?.fullName ?? '—'
        const svcFull = services.find(s => s.name === selectedAppt.service)
        const isPast = selectedApptFull ? new Date(selectedApptFull.endTime) < now : false
        return (
          <div
            onClick={() => setSelectedAppt(null)}
            style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ background: 'var(--bg-2)', borderRadius: 16, width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-lg)', border: '1px solid var(--line)', overflow: 'hidden' }}
            >
              {/* Color accent top bar */}
              <div style={{ height: 3, background: c.border }} />

              {/* Header */}
              <div style={{ padding: '1.125rem 1.25rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.875rem' }}>
                  <div style={{ flex: 1 }}>
                    {/* Time + duration */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.375rem' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--fg-0)', lineHeight: 1, letterSpacing: '-0.02em' }}>
                        {selectedAppt.startH.toString().padStart(2,'0')}:{selectedAppt.startM.toString().padStart(2,'0')}
                      </span>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--fg-3)', fontWeight: 400 }}>
                        {selectedAppt.durationMin} min
                      </span>
                    </div>
                    {/* Service */}
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 700, color: 'var(--fg-0)', display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      {selectedAppt.service}
                      {svcFull && <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-2)' }}>{svcFull.price}€</span>}
                    </div>
                  </div>
                  <button onClick={() => setSelectedAppt(null)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>

                {/* Meta row: date + barber */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: 12, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', marginBottom: '0.75rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                    {new Date(selectedApptFull?.startTime ?? `2000-01-01T${selectedAppt.startH.toString().padStart(2,'0')}:${selectedAppt.startM.toString().padStart(2,'0')}`).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                  <span style={{ color: 'var(--fg-4)' }}>·</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    {barberName}
                  </span>
                </div>

                {/* Client button */}
                <button
                  onClick={() => setProfileClientId(selectedAppt.clientId)}
                  style={{
                    width: '100%', padding: '0.625rem 0.875rem', borderRadius: 8,
                    border: '1px solid var(--line)', background: 'var(--bg-3)',
                    color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fg-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                  <span style={{ flex: 1, textAlign: 'left' }}>{selectedAppt.client}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-3)" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              </div>

              {/* Loyalty controls */}
              {selectedApptFull && (
                <div style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid var(--line)' }}>
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
                  <button
                    onClick={() => setRescheduleAppt(selectedAppt)}
                    style={{ flex: 1, padding: '0.7rem', minHeight: 42, borderRadius: 8, border: 'none', background: 'var(--led)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Reprogramar
                  </button>
                  <button
                    onClick={() => setSelectedAppt(null)}
                    style={{ flex: 1, padding: '0.7rem', minHeight: 42, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-1)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}
                  >
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
                    style={{ width: '100%', padding: '0.7rem', minHeight: 42, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 400, cursor: 'pointer', opacity: cancelWithDeduction.isPending ? 0.6 : 1 }}
                  >
                    Marcar ausencia
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
          />
        )
      })()}

      {qrScanOpen && (
        <QRScannerModal
          onScan={(memberCode) => {
            setQrScanOpen(false)
            const entry = loyaltyCards
              ? [...loyaltyCards.entries()].find(([, card]) => card.memberCode === memberCode)
              : null
            if (entry) {
              setProfileClientId(entry[0])
            }
          }}
          onClose={() => setQrScanOpen(false)}
        />
      )}
    </>
  )
}

function calcInitials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?'
}

function QRScannerModal({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(true)

  const stopStream = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  useEffect(() => {
    let active = true
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } } })
      .then(stream => {
        if (!active) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      })
      .catch(() => setError('No se pudo acceder a la cámara. Comprueba los permisos.'))
    return () => { active = false; stopStream() }
  }, [stopStream])

  const tickRef = useRef<() => void>(() => {})

  const tick = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !scanning) return
    if (video.readyState < 2) { rafRef.current = requestAnimationFrame(tickRef.current); return }
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const result = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' })
    if (result?.data) {
      const match = result.data.match(/^GIO-BARBER:\/\/member\/(.+)$/)
      if (match) {
        setScanning(false)
        stopStream()
        onScan(match[1])
        return
      }
    }
    rafRef.current = requestAnimationFrame(tickRef.current)
  }, [scanning, stopStream, onScan])

  useEffect(() => { tickRef.current = tick }, [tick])

  useEffect(() => {
    if (!error && scanning) {
      rafRef.current = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(rafRef.current)
    }
  }, [error, scanning, tick])

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-2)', borderRadius: 16, width: '100%', maxWidth: 380, border: '1px solid var(--line)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--line)' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--fg-0)', letterSpacing: '0.04em' }}>Escanear tarjeta</div>
            <div style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', marginTop: 2 }}>Apunta la cámara al código QR del cliente</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Camera */}
        <div style={{ position: 'relative', background: '#000', aspectRatio: '4/3', overflow: 'hidden' }}>
          {error ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1.5rem' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--brick-warm)" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
              <div style={{ fontSize: 13, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', textAlign: 'center' }}>{error}</div>
            </div>
          ) : (
            <>
              <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {/* Scanning frame overlay */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ width: 180, height: 180, position: 'relative' }}>
                  {/* Corner brackets */}
                  {[['0 auto auto 0', '0 auto auto 0'], ['0 0 auto auto', '0 0 auto auto'], ['auto auto 0 0', 'auto auto 0 0'], ['auto 0 0 auto', 'auto 0 0 auto']].map(([_t, _], idx) => {
                    const isTop = idx < 2; const isLeft = idx % 2 === 0
                    return (
                      <div key={idx} style={{
                        position: 'absolute',
                        top: isTop ? 0 : undefined, bottom: !isTop ? 0 : undefined,
                        left: isLeft ? 0 : undefined, right: !isLeft ? 0 : undefined,
                        width: 24, height: 24,
                        borderTop: isTop ? '2.5px solid rgba(255,255,255,0.9)' : undefined,
                        borderBottom: !isTop ? '2.5px solid rgba(255,255,255,0.9)' : undefined,
                        borderLeft: isLeft ? '2.5px solid rgba(255,255,255,0.9)' : undefined,
                        borderRight: !isLeft ? '2.5px solid rgba(255,255,255,0.9)' : undefined,
                        borderRadius: isTop && isLeft ? '4px 0 0 0' : isTop ? '0 4px 0 0' : isLeft ? '0 0 0 4px' : '0 0 4px 0',
                      }} />
                    )
                  })}
                  <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4 }} />
                </div>
              </div>
            </>
          )}
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <div style={{ padding: '0.875rem 1.25rem' }}>
          <button onClick={onClose} style={{ width: '100%', padding: '0.7rem', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-1)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

const navBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 32, height: 32, borderRadius: 6,
  border: '1px solid var(--line)', background: 'transparent',
  color: 'var(--fg-2)', cursor: 'pointer',
}
