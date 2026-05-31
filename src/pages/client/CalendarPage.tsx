import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useShopContext } from '@/context/ShopContext'
import { getMaxBookingDate, getAvailableBarbersForDate, getBarbersAvailableForSlot } from '@/domain/booking'
import { DEFAULT_WEEKLY_SCHEDULE, type DayKey } from '@/domain/schedule'
import { MonthCalendar, TimeSlots, generateScheduleSlots } from '@/components/calendar'
import { Modal } from '@/components/ui'
import { useAuth } from '@/hooks'
import { useServices } from '@/hooks/useServices'
import { useBarbers } from '@/hooks/useBarbers'
import { useWeeklySchedule, useScheduleBlocks } from '@/hooks/useSchedule'
import { useClientAppointments, useAllAppointments, useCreateAppointment } from '@/hooks/useAppointments'
import type { Service } from '@/domain/service'
import type { Barber } from '@/domain/barber'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtLong(date: Date) {
  return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
}
function fmtHeader(date: Date) {
  return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()
}
function getInitials(name: string) {
  return name.split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2)
}
const JS_TO_DAY: Record<number, DayKey> = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 0: 'sun' }

// ── Step circle ────────────────────────────────────────────────────────────────

function StepCircle({ num, done, active }: { num: number; done: boolean; active: boolean }) {
  if (done && !active) {
    return (
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    )
  }
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
      border: active ? '2px solid var(--gold)' : '1.5px solid var(--line)',
      background: active ? 'rgba(201,162,74,0.1)' : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700,
      color: active ? 'var(--gold)' : 'var(--fg-4)',
      transition: 'all 0.2s',
    }}>
      {num}
    </div>
  )
}

// ── Accordion step ─────────────────────────────────────────────────────────────

interface AccordionStepProps {
  num: number
  title: string
  badge?: string          // shown collapsed next to title when done (e.g. "10:30")
  isOpen: boolean
  isDone: boolean
  isLocked: boolean
  onToggle: () => void
  children: React.ReactNode
  fillHeight?: boolean
  headerRight?: React.ReactNode
}

function AccordionStep({ num, title, badge, isOpen, isDone, isLocked, onToggle, children, fillHeight, headerRight }: AccordionStepProps) {
  return (
    <div style={{
      borderRadius: 12,
      border: `1px solid ${isOpen ? 'rgba(201,162,74,0.5)' : 'var(--line)'}`,
      background: isOpen ? 'var(--bg-2)' : 'var(--bg-2)',
      overflow: 'hidden',
      opacity: isLocked ? 0.42 : 1,
      transition: 'border-color 0.18s, opacity 0.18s',
      ...(fillHeight && isOpen
        ? { flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column' as const }
        : { flexShrink: 0 }),
    }}>
      {/* ── Header button ── */}
      <button
        onClick={onToggle}
        style={{
          width: '100%', padding: '0.75rem 1rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', flexShrink: 0,
        }}
      >
        <StepCircle num={num} done={isDone} active={isOpen} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: isOpen ? 'var(--gold)' : isDone ? 'var(--fg-2)' : 'var(--fg-4)',
            transition: 'color 0.18s', flexShrink: 0,
          }}>
            {title}
          </span>
          {/* Badge: value shown collapsed when done */}
          {!isOpen && isDone && badge && (
            <span style={{
              fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700, color: 'var(--gold)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              · {badge}
            </span>
          )}
        </div>
        {headerRight && (
          <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
            {headerRight}
          </div>
        )}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke={isOpen ? 'var(--gold)' : 'var(--fg-4)'}
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* ── Content ── */}
      {fillHeight ? (
        isOpen ? (
          <div className="[&::-webkit-scrollbar]:hidden"
            style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarWidth: 'none' }}>
            <div style={{ padding: '0 1rem 1rem' }}>{children}</div>
          </div>
        ) : null
      ) : (
        <div style={{ maxHeight: isOpen ? 1200 : 0, overflow: 'hidden', transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
          <div style={{ padding: '0 1rem 1rem' }}>{children}</div>
        </div>
      )}
    </div>
  )
}

// ── Service row ───────────────────────────────────────────────────────────────

function ServiceRow({ service, selected, onClick }: { service: Service; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.875rem',
        width: '100%', padding: '0.875rem 1rem', borderRadius: 10,
        border: selected ? '1.5px solid var(--gold)' : '1px solid var(--line)',
        background: selected ? 'rgba(201,162,74,0.07)' : 'var(--bg-3)',
        cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: 5, flexShrink: 0,
        border: selected ? '2px solid var(--gold)' : '1.5px solid var(--line)',
        background: selected ? 'var(--gold)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}>
        {selected && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--fg-0)' }}>{service.name}</div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--fg-3)', marginTop: 1 }}>{service.durationMinutes} min</div>
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 18,
        color: selected ? 'var(--gold)' : 'var(--fg-1)',
        letterSpacing: '0.02em', transition: 'color 0.15s', flexShrink: 0,
      }}>
        {service.price}€
      </div>
    </button>
  )
}

// ── Barber card ───────────────────────────────────────────────────────────────

function BarberCard({ barber, selected, onClick }: { barber: Barber | null; selected: boolean; onClick: () => void }) {
  const isAny = barber === null
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.75rem 1rem', borderRadius: 10, flex: '1 1 auto',
        border: selected ? '1.5px solid var(--gold)' : '1px solid var(--line)',
        background: selected ? 'rgba(201,162,74,0.07)' : 'var(--bg-3)',
        cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
        background: selected ? 'var(--gold)' : isAny ? 'var(--bg-4)' : 'rgba(123,79,255,0.2)',
        border: selected ? 'none' : '1.5px solid var(--line)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: isAny ? 15 : 13, fontWeight: 700,
        color: selected ? '#000' : isAny ? 'var(--fg-2)' : 'var(--led-soft)',
        transition: 'all 0.15s',
      }}>
        {isAny ? '✦' : getInitials(barber.fullName)}
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: selected ? 'var(--gold)' : 'var(--fg-0)' }}>
          {isAny ? 'Cualquier barbero' : barber.fullName}
        </div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--fg-3)', marginTop: 1 }}>
          {isAny ? 'Sin preferencia' : (barber as Barber & { specialty?: string }).specialty ?? ''}
        </div>
      </div>
    </button>
  )
}

type StepId = 'date' | 'time' | 'barber' | 'service'

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { name: shopName, maxAdvanceDays, allowBarberChoice } = useShopContext()
  const today = useMemo(() => new Date(), [])
  const maxDate = getMaxBookingDate(maxAdvanceDays)

  const { data: services = [], isLoading: loadingServices } = useServices()
  const { data: allBarbers = [] } = useBarbers()
  const { data: schedule = DEFAULT_WEEKLY_SCHEDULE, isLoading: loadingSchedule } = useWeeklySchedule()
  const { data: blocks = [] } = useScheduleBlocks()
  const { data: myAppointments = [] } = useClientAppointments(user?.id)
  const { data: allAppointments = [] } = useAllAppointments()
  const createAppointment = useCreateAppointment()

  const [month, setMonth]   = useState(today.getMonth())
  const [year, setYear]     = useState(today.getFullYear())
  const [selectedDate, setSelectedDate]   = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot]   = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedBarber, setSelectedBarber]   = useState<Barber | null>(null)
  const [activeStep, setActiveStep]           = useState<StepId | null>('date')
  const [confirmOpen, setConfirmOpen]         = useState(false)
  const [bookingError, setBookingError]       = useState<string | null>(null)
  const [bookingBlocked, setBookingBlocked]   = useState(false)

  useEffect(() => {
    if (!window.matchMedia('(min-width: 1024px)').matches) return
    const html = document.documentElement
    const prev = html.style.overflowY
    html.style.overflowY = 'hidden'
    return () => { html.style.overflowY = prev }
  }, [])

  // ── Computed ────────────────────────────────────────────────────────────────

  const { fromTime, toTime } = useMemo(() => {
    if (!selectedDate) return { fromTime: '10:00', toTime: '19:00' }
    const key = JS_TO_DAY[selectedDate.getDay()]
    const day = schedule[key]
    return { fromTime: day.from || '10:00', toTime: day.to || '19:00' }
  }, [selectedDate, schedule])

  const availableBarbers = useMemo<Barber[]>(() => {
    if (loadingSchedule || !selectedDate) return allBarbers.filter(b => b.isActive)
    return getAvailableBarbersForDate(selectedDate, schedule, blocks, allBarbers)
  }, [selectedDate, allBarbers, schedule, blocks, loadingSchedule])

  const allSlots = useMemo(() => generateScheduleSlots(fromTime, toTime), [fromTime, toTime])

  const breakBlockedSlots = useMemo<string[]>(() => {
    if (!selectedService) return []
    const check = selectedBarber ? [selectedBarber] : availableBarbers
    return allSlots.filter(s => getBarbersAvailableForSlot(s, selectedService.durationMinutes, check).length === 0)
  }, [selectedService, selectedBarber, availableBarbers, allSlots])

  const appointmentBlockedSlots = useMemo<string[]>(() => {
    if (!selectedDate || !allAppointments.length) return []
    const check = selectedBarber ? [selectedBarber.id] : availableBarbers.map(b => b.id)
    const dateStr = selectedDate.toISOString().slice(0, 10)
    const dayAppts = allAppointments.filter(a =>
      a.status === 'confirmed' && check.includes(a.barberId) &&
      new Date(a.startTime).toISOString().slice(0, 10) === dateStr,
    )
    if (!dayAppts.length) return []
    return allSlots.filter(slot => {
      const [h, m] = slot.split(':').map(Number)
      const s = new Date(selectedDate); s.setHours(h, m, 0, 0)
      const e = new Date(s.getTime() + 30 * 60_000)
      return dayAppts.some(a => new Date(a.startTime) < e && new Date(a.endTime) > s)
    })
  }, [selectedDate, allAppointments, selectedBarber, availableBarbers, allSlots])

  const pastSlots = useMemo<string[]>(() => {
    if (!selectedDate) return []
    const todayMidnight = new Date(today); todayMidnight.setHours(0, 0, 0, 0)
    const selMidnight = new Date(selectedDate); selMidnight.setHours(0, 0, 0, 0)
    if (selMidnight.getTime() !== todayMidnight.getTime()) return []
    const nowH = today.getHours()
    const nowM = today.getMinutes()
    return allSlots.filter(slot => {
      const [h, m] = slot.split(':').map(Number)
      return h < nowH || (h === nowH && m <= nowM)
    })
  }, [selectedDate, allSlots, today])

  const takenSlots = useMemo(
    () => [...new Set([...breakBlockedSlots, ...appointmentBlockedSlots, ...pastSlots])],
    [breakBlockedSlots, appointmentBlockedSlots, pastSlots],
  )
  const freeCount = useMemo(
    () => allSlots.filter(s => !takenSlots.includes(s)).length,
    [allSlots, takenSlots],
  )

  const hasActiveAppt = useMemo(
    () => myAppointments.some(a => a.status === 'confirmed' && new Date(a.startTime) > new Date()),
    [myAppointments],
  )
  const busyDays = useMemo(() =>
    myAppointments.filter(a => a.status !== 'cancelled' && a.status !== 'no_show')
      .filter(a => { const d = new Date(a.startTime); return d.getFullYear() === year && d.getMonth() === month })
      .map(a => new Date(a.startTime).getDate()),
    [myAppointments, year, month])

  const closedDayOfWeeks = useMemo(() => {
    const M: Record<DayKey, number> = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 }
    return (Object.entries(schedule) as [DayKey, { open: boolean }][])
      .filter(([, d]) => !d.open).map(([k]) => M[k])
  }, [schedule])

  const partialDates = useMemo(() =>
    blocks.filter(b => b.blockDate !== null && b.startTime !== null && !b.isRecurring).map(b => b.blockDate!),
    [blocks])

  const canConfirm = !!(selectedDate && selectedSlot && selectedService && !createAppointment.isPending)

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleDateSelect = useCallback((d: Date) => {
    if (d > maxDate) return
    if (closedDayOfWeeks.includes((d.getDay() + 6) % 7)) return
    if (selectedDate &&
        selectedDate.getFullYear() === d.getFullYear() &&
        selectedDate.getMonth() === d.getMonth() &&
        selectedDate.getDate() === d.getDate()) {
      setSelectedDate(null); setSelectedSlot(null); setSelectedBarber(null); setSelectedService(null)
      setActiveStep('date')
      return
    }
    setSelectedDate(d); setSelectedSlot(null); setSelectedBarber(null); setSelectedService(null)
    setBookingBlocked(hasActiveAppt)
    setActiveStep('time')
  }, [maxDate, closedDayOfWeeks, selectedDate, hasActiveAppt])

  const handleSlotSelect = useCallback((slot: string) => {
    if (selectedSlot === slot) {
      setSelectedSlot(null); setSelectedBarber(null); setSelectedService(null)
      setActiveStep('time')
      return
    }
    setSelectedSlot(slot); setSelectedBarber(null); setSelectedService(null)
    setActiveStep(allowBarberChoice ? 'barber' : 'service')
  }, [selectedSlot, allowBarberChoice])

  const handleBarberSelect = useCallback((b: Barber | null) => {
    if (b !== null && selectedBarber?.id === b.id) {
      setSelectedBarber(null); setSelectedService(null)
      setActiveStep('service')
      return
    }
    setSelectedBarber(b); setSelectedService(null)
    setActiveStep('service')
  }, [selectedBarber])

  // Toggle: clicking open step closes it (→ null), clicking closed opens it
  const toggle = useCallback((step: StepId) => {
    setActiveStep(cur => cur === step ? null : step)
  }, [])

  const handleServiceSelect = useCallback((s: Service) => {
    setSelectedService(prev => prev?.id === s.id ? null : s)
  }, [])

  const handleConfirm = useCallback(() => {
    if (!selectedDate || !selectedSlot || !selectedService || !user) return
    setBookingError(null)
    const [h, m] = selectedSlot.split(':').map(Number)
    const start = new Date(selectedDate); start.setHours(h, m, 0, 0)
    const end = new Date(start.getTime() + selectedService.durationMinutes * 60_000)
    const barberId = selectedBarber?.id ?? availableBarbers[0]?.id ?? ''
    createAppointment.mutate(
      { clientId: user.id, barberId, serviceId: selectedService.id, startTime: start.toISOString(), endTime: end.toISOString() },
      {
        onSuccess: () => {
          setConfirmOpen(false)
          setSelectedDate(null); setSelectedSlot(null); setSelectedService(null); setSelectedBarber(null)
          setActiveStep('date')
          navigate('/appointments', { replace: true })
        },
        onError: () => setBookingError('No se pudo guardar la cita. Inténtalo de nuevo.'),
      },
    )
  }, [selectedDate, selectedSlot, selectedService, user, selectedBarber, availableBarbers, createAppointment, navigate])

  // ── Shared step content ──────────────────────────────────────────────────────

  const stepContent = (fill: boolean) => (
    <>
      <AccordionStep num={1} title="Fecha"
        isOpen={activeStep === 'date'} isDone={!!selectedDate} isLocked={false}
        onToggle={() => toggle('date')} fillHeight={fill}
      >
        <MonthCalendar
          selected={selectedDate} onSelect={handleDateSelect}
          month={month} year={year}
          onMonthChange={(m, y) => { setMonth(m); setYear(y) }}
          maxDate={maxDate} closedDayOfWeeks={closedDayOfWeeks}
          partialDates={partialDates} busyDays={busyDays}
        />
      </AccordionStep>

      <AccordionStep num={2} title="Horario"
        isOpen={activeStep === 'time'} isDone={!!selectedSlot} isLocked={!selectedDate}
        onToggle={() => toggle('time')} fillHeight={fill}
      >
        {bookingBlocked ? (
          <p style={{ fontSize: 13, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', lineHeight: 1.6 }}>
            Ya tienes una cita activa. Reprograma desde{' '}
            <button onClick={() => navigate('/appointments')}
              style={{ background: 'none', border: 'none', padding: 0, color: 'var(--gold)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13 }}>
              Mis Citas
            </button>.
          </p>
        ) : !selectedDate ? (
          <p style={{ fontSize: 13, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)' }}>Selecciona una fecha en el Paso 1.</p>
        ) : availableBarbers.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)' }}>No hay barberos disponibles este día.</p>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--fg-1)', textTransform: 'uppercase' }}>
                {fmtHeader(selectedDate)}
              </span>
              <span style={{ padding: '0.15rem 0.5rem', borderRadius: 20, background: 'rgba(201,162,74,0.1)', border: '1px solid rgba(201,162,74,0.25)', fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, color: 'var(--gold)' }}>
                {freeCount} disponibles
              </span>
            </div>
            <TimeSlots selected={selectedSlot} onSelect={handleSlotSelect} taken={takenSlots} fromTime={fromTime} toTime={toTime} />
          </>
        )}
      </AccordionStep>

      {allowBarberChoice && (
        <AccordionStep num={3} title="Barbero"
          isOpen={activeStep === 'barber'} isDone={!!selectedSlot} isLocked={!selectedSlot}
          onToggle={() => toggle('barber')}
        >
          {!selectedSlot ? (
            <p style={{ fontSize: 13, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)' }}>Selecciona una hora en el Paso 2.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.25rem' }}>
              {availableBarbers.map(b => (
                <BarberCard key={b.id} barber={b} selected={selectedBarber?.id === b.id} onClick={() => handleBarberSelect(b)} />
              ))}
              <BarberCard barber={null} selected={selectedBarber === null} onClick={() => handleBarberSelect(null)} />
            </div>
          )}
        </AccordionStep>
      )}

      <AccordionStep num={allowBarberChoice ? 4 : 3} title="Servicio"
        isOpen={activeStep === 'service'} isDone={!!selectedService} isLocked={!selectedSlot}
        onToggle={() => toggle('service')}
      >
        {!selectedSlot ? (
          <p style={{ fontSize: 13, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)' }}>Selecciona una hora en el Paso 2.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '0.25rem' }}>
            {loadingServices
              ? <p style={{ fontSize: 13, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)' }}>Cargando servicios…</p>
              : services.map(s => <ServiceRow key={s.id} service={s} selected={selectedService?.id === s.id} onClick={() => handleServiceSelect(s)} />)
            }
          </div>
        )}
      </AccordionStep>
    </>
  )

  // ── Summary card ─────────────────────────────────────────────────────────────

  const summaryCard = (fullHeight: boolean) => {
    const p = fullHeight ? '1.5rem' : '1.25rem'
    const stepDone = allowBarberChoice
      ? [!!selectedDate, !!selectedSlot, !!selectedSlot, !!selectedService]
      : [!!selectedDate, !!selectedSlot, !!selectedService]
    const progressPct = (stepDone.filter(Boolean).length / stepDone.length) * 100
    const dateDay = selectedDate?.getDate()
    const dateDayName = selectedDate?.toLocaleDateString('es-ES', { weekday: 'long' }).toUpperCase()
    const dateMonthYear = selectedDate?.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()
    const barberInitials = selectedBarber ? getInitials(selectedBarber.fullName) : '✦'

    return (
      <div style={{
        background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 16,
        display: 'flex', flexDirection: 'column',
        ...(fullHeight ? { height: '100%', overflow: 'hidden' } : {}),
      }}>

        {/* ── Header: label + barra de progreso ── */}
        <div style={{ padding: `1.1rem ${p} 1rem`, borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--gold)', margin: '0 0 0.75rem' }}>
            RESUMEN
          </p>
          <div style={{ height: 3, borderRadius: 2, background: 'var(--bg-4)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: 'linear-gradient(90deg, rgba(201,162,74,0.7), var(--gold))',
              width: `${progressPct}%`,
              transition: 'width 0.35s ease',
            }} />
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ ...(fullHeight ? { flex: 1, minHeight: 0, overflowY: 'auto', scrollbarWidth: 'none' as const } : {}) }}>

          {/* Date ticket stub */}
          <div style={{ padding: `1rem ${p} 0` }}>
            {selectedDate ? (
              <div style={{
                borderRadius: 11, border: '1px solid rgba(201,162,74,0.3)',
                background: 'rgba(201,162,74,0.04)', overflow: 'hidden',
              }}>
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  <div style={{
                    width: 64, flexShrink: 0,
                    background: 'rgba(201,162,74,0.12)',
                    borderRight: '1px dashed rgba(201,162,74,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0.875rem 0',
                  }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 44, color: 'var(--gold)', lineHeight: 1, letterSpacing: '0.02em' }}>
                      {dateDay}
                    </span>
                  </div>
                  <div style={{ flex: 1, padding: '0.75rem 0.875rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--fg-0)', letterSpacing: '0.07em', lineHeight: 1 }}>
                      {dateDayName}
                    </div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.06em' }}>
                      {dateMonthYear}
                    </div>
                    {selectedSlot ? (
                      <span style={{
                        display: 'inline-block', marginTop: 4,
                        fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700,
                        color: 'var(--gold)', background: 'rgba(201,162,74,0.15)',
                        border: '1px solid rgba(201,162,74,0.3)',
                        borderRadius: 6, padding: '0.15rem 0.5rem', width: 'fit-content',
                      }}>
                        {selectedSlot}
                      </span>
                    ) : (
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--fg-4)', marginTop: 4 }}>
                        Elige hora →
                      </span>
                    )}
                  </div>
                  {selectedSlot && (
                    <div style={{ padding: '0 0.75rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', background: 'var(--ok)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{
                borderRadius: 11, border: '1px dashed var(--line)',
                padding: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
                background: 'var(--bg-3)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  background: 'var(--bg-4)', border: '1px solid var(--line)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--fg-4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="16" y1="2" x2="16" y2="6" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--fg-4)', textTransform: 'uppercase', marginBottom: 3 }}>
                    Fecha y hora
                  </div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--fg-4)' }}>
                    Selecciona en el Paso 1
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dashed divider */}
          <div style={{ margin: `0.875rem ${p}`, borderTop: '1px dashed var(--line-2)', opacity: 0.5 }} />

          {/* Barbero row */}
          <div style={{ padding: `0 ${p}`, display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
              background: selectedSlot
                ? (selectedBarber ? 'rgba(123,79,255,0.18)' : 'rgba(201,162,74,0.12)')
                : 'var(--bg-4)',
              border: `1.5px solid ${selectedSlot ? (selectedBarber ? 'rgba(123,79,255,0.4)' : 'rgba(201,162,74,0.35)') : 'var(--line)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700,
              color: selectedSlot ? (selectedBarber ? 'var(--led-soft)' : 'var(--gold)') : 'var(--fg-4)',
              transition: 'all 0.2s',
            }}>
              {selectedSlot ? barberInitials : '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--fg-3)', textTransform: 'uppercase', marginBottom: 3 }}>
                Barbero
              </div>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: selectedSlot ? 'var(--fg-0)' : 'var(--fg-4)', fontWeight: selectedSlot ? 500 : 400 }}>
                {selectedSlot ? (selectedBarber?.fullName ?? 'Cualquier barbero') : '—'}
              </span>
            </div>
          </div>

          {/* Dashed divider */}
          <div style={{ margin: `0.875rem ${p}`, borderTop: '1px dashed var(--line-2)', opacity: 0.5 }} />

          {/* Servicio row */}
          <div style={{ padding: `0 ${p} 1rem` }}>
            {selectedService ? (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(201,162,74,0.12)', border: '1px solid rgba(201,162,74,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--fg-3)', textTransform: 'uppercase', marginBottom: 3 }}>
                    Servicio
                  </div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--fg-0)', fontWeight: 600, lineHeight: 1.3 }}>
                    {selectedService.name}
                  </div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--fg-3)', marginTop: 3 }}>
                    {selectedService.durationMinutes} min
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: 'var(--bg-4)', border: '1px dashed var(--line)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--fg-4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--fg-4)', textTransform: 'uppercase', marginBottom: 3 }}>
                    Servicio
                  </div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--fg-4)' }}>
                    Selecciona en el Paso {allowBarberChoice ? 4 : 3}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ flexShrink: 0, padding: `0.875rem ${p} 1.5rem`, borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <p style={{
              fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.14em',
              color: 'var(--fg-3)', marginBottom: '0.25rem', textTransform: 'uppercase',
            }}>
              Total
            </p>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 3vw, 42px)',
              color: selectedService ? 'var(--gold)' : 'var(--fg-4)', lineHeight: 1, transition: 'color 0.2s',
            }}>
              {selectedService ? `${selectedService.price}€` : '—'}
            </span>
            {selectedService && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 7 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="var(--gold)" stroke="none">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(201,162,74,0.75)', letterSpacing: '0.02em' }}>
                  Ganarás <strong style={{ color: 'var(--gold)' }}>+{selectedService.loyaltyPoints} pts</strong> de fidelidad
                </span>
              </div>
            )}
          </div>
          <button
            disabled={!canConfirm}
            onClick={() => setConfirmOpen(true)}
            style={{
              width: '100%', padding: '0.9rem', borderRadius: 10, border: 'none',
              background: canConfirm ? 'var(--gold)' : 'var(--bg-4)',
              color: canConfirm ? '#000' : 'var(--fg-3)',
              fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700,
              cursor: canConfirm ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              transition: 'all 0.2s',
            }}
          >
            Confirmar reserva
            {canConfirm && (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <Helmet><title>Pedir cita — {shopName}</title></Helmet>

      {/* ── DESKTOP: fits viewport, no scrollbar ─────────────────────────── */}
      <div className="hidden lg:flex" style={{ flexDirection: 'column', height: 'calc(100dvh - 104px)', padding: '1.25rem 0', overflow: 'hidden' }}>
        {/* Title row */}
        <div style={{ flexShrink: 0, marginBottom: '1rem', maxWidth: '920px', width: '100%', alignSelf: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(20px, 2.2vw, 30px)', letterSpacing: '0.06em', color: 'var(--fg-0)', lineHeight: 1, margin: 0 }}>
            PEDIR CITA
          </h1>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--fg-3)', marginTop: 4, marginBottom: 0 }}>
            Completa cada paso para reservar tu cita
          </p>
        </div>
        {/* Two-column grid — fills remaining height */}
        <div style={{
          flex: 1, minHeight: 0,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          columnGap: '2.5rem',
          maxWidth: '920px',
          margin: '0 auto',
          width: '100%',
        }}>
          {/* Left: accordion steps fill height */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', height: '100%' }}>
            {stepContent(true)}
          </div>
          {/* Right: summary card, same height as left column */}
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {summaryCard(true)}
          </div>
        </div>
      </div>

      {/* ── MOBILE: natural scroll ────────────────────────────────────────── */}
      <div className="flex flex-col lg:hidden" style={{ gap: '1.25rem', paddingBottom: '2rem' }}>
        <div>
          <div style={{ marginBottom: '1.25rem' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 6vw, 30px)', letterSpacing: '0.06em', color: 'var(--fg-0)', lineHeight: 1, margin: 0 }}>
              PEDIR CITA
            </h1>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--fg-3)', marginTop: 5, marginBottom: 0 }}>
              Completa cada paso para reservar
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {stepContent(false)}
          </div>
        </div>
        {summaryCard(false)}
      </div>


      {/* ── Confirmation modal ───────────────────────────────────────────────── */}
      {confirmOpen && (
        <Modal onClose={() => setConfirmOpen(false)} title="Confirmar reserva">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Fecha',    value: selectedDate ? fmtLong(selectedDate) : '' },
              { label: 'Hora',     value: selectedSlot ?? '' },
              { label: 'Servicio', value: selectedService?.name ?? '' },
              { label: 'Barbero',  value: selectedBarber?.fullName ?? 'Cualquier barbero' },
              { label: 'Duración', value: selectedService ? `${selectedService.durationMinutes} min` : '' },
              { label: 'Precio',   value: selectedService ? `${selectedService.price}€` : '' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)' }}>{label}</span>
                <span style={{ fontSize: 13, color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontWeight: 500 }}>{value}</span>
              </div>
            ))}
            {selectedService && (
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid var(--line)' }}>
                <span style={{ fontSize: 13, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)' }}>Ganarás</span>
                <span style={{ fontSize: 13, color: 'var(--gold)', fontFamily: 'var(--font-ui)', fontWeight: 600 }}>★ {selectedService.loyaltyPoints} pts</span>
              </div>
            )}
          </div>
          {bookingError && (
            <p style={{ color: 'var(--danger)', fontSize: 13, fontFamily: 'var(--font-ui)', marginBottom: '0.75rem', textAlign: 'center' }}>
              {bookingError}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => setConfirmOpen(false)} disabled={createAppointment.isPending}
              style={{ flex: 1, padding: '0.75rem', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-1)', fontFamily: 'var(--font-ui)', cursor: 'pointer', minHeight: 44, opacity: createAppointment.isPending ? 0.5 : 1 }}>
              Cancelar
            </button>
            <button onClick={handleConfirm} disabled={createAppointment.isPending}
              style={{ flex: 1, padding: '0.75rem', borderRadius: 8, border: 'none', background: 'var(--gold)', color: '#000', fontFamily: 'var(--font-ui)', fontWeight: 700, cursor: createAppointment.isPending ? 'default' : 'pointer', opacity: createAppointment.isPending ? 0.7 : 1, minHeight: 44, boxShadow: '0 4px 16px rgba(201,162,74,0.3)' }}>
              {createAppointment.isPending ? 'Guardando…' : 'Confirmar'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
