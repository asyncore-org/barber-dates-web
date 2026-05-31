import { useState, useMemo, useCallback } from 'react'
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
// fillHeight=true: open step grows to fill remaining flex space (desktop).
// fillHeight=false: open step uses max-height animation (mobile).

interface AccordionStepProps {
  num: number
  title: string
  summary?: string
  isOpen: boolean
  isDone: boolean
  isLocked: boolean
  onToggle: () => void
  children: React.ReactNode
  fillHeight?: boolean
}

function AccordionStep({ num, title, summary, isOpen, isDone, isLocked, onToggle, children, fillHeight }: AccordionStepProps) {
  return (
    <div style={{
      borderRadius: 14,
      border: isOpen ? '1.5px solid var(--gold)' : '1px solid var(--line)',
      background: 'var(--bg-2)',
      overflow: 'hidden',
      opacity: isLocked ? 0.42 : 1,
      transition: 'border-color 0.2s, opacity 0.2s',
      // fillHeight: open=flex column growing, closed=shrinks to header height
      ...(fillHeight
        ? isOpen
          ? { flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column' as const }
          : { flexShrink: 0 }
        : {}),
    }}>
      {/* Header */}
      <button
        onClick={isLocked ? undefined : onToggle}
        disabled={isLocked}
        style={{
          width: '100%', padding: '0.9rem 1.1rem',
          display: 'flex', alignItems: 'center', gap: '0.875rem',
          background: 'none', border: 'none', cursor: isLocked ? 'default' : 'pointer',
          textAlign: 'left', flexShrink: 0,
        }}
      >
        <StepCircle num={num} done={isDone} active={isOpen} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            color: isOpen ? 'var(--gold)' : isDone ? 'var(--fg-3)' : 'var(--fg-4)',
            marginBottom: (!isOpen && isDone && summary) ? 3 : 0,
            transition: 'color 0.2s',
          }}>
            Paso {num} · {title}
          </div>
          {!isOpen && isDone && summary && (
            <div style={{
              fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--fg-0)',
              fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {summary}
            </div>
          )}
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke={isOpen ? 'var(--gold)' : 'var(--fg-4)'}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s, stroke 0.2s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Content */}
      {fillHeight ? (
        // Desktop: open content fills remaining flex height; scrollbar hidden so content is accessible
        // on any screen size without a visible scrollbar appearing
        isOpen ? (
          <div
            style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarWidth: 'none', display: 'flex', flexDirection: 'column' }}
            className="[&::-webkit-scrollbar]:hidden"
          >
            <div style={{ padding: '0 1.1rem 1.1rem' }}>
              {children}
            </div>
          </div>
        ) : null
      ) : (
        // Mobile: animated max-height expand/collapse
        <div style={{
          maxHeight: isOpen ? 1400 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.38s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          <div style={{ padding: '0 1.1rem 1.1rem' }}>
            {children}
          </div>
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
  const [activeStep, setActiveStep]           = useState<StepId>('date')
  const [confirmOpen, setConfirmOpen]         = useState(false)
  const [bookingError, setBookingError]       = useState<string | null>(null)
  const [bookingBlocked, setBookingBlocked]   = useState(false)

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
  const [ticketNum] = useState(() => String(Math.floor(Math.random() * 9000) + 1000))

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleDateSelect = useCallback((d: Date) => {
    if (d > maxDate) return
    if (closedDayOfWeeks.includes((d.getDay() + 6) % 7)) return
    setSelectedDate(d)
    setSelectedSlot(null)
    setBookingBlocked(hasActiveAppt)
    if (selectedBarber && !getAvailableBarbersForDate(d, schedule, blocks, allBarbers).some(b => b.id === selectedBarber.id))
      setSelectedBarber(null)
    setActiveStep('time')
  }, [maxDate, closedDayOfWeeks, hasActiveAppt, selectedBarber, schedule, blocks, allBarbers])

  const handleSlotSelect = useCallback((slot: string) => {
    setSelectedSlot(slot)
    setActiveStep(allowBarberChoice ? 'barber' : 'service')
  }, [allowBarberChoice])

  const handleBarberSelect = useCallback((b: Barber | null) => {
    setSelectedBarber(b)
    setActiveStep('service')
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
        summary={selectedDate ? fmtLong(selectedDate) : undefined}
        isOpen={activeStep === 'date'} isDone={!!selectedDate} isLocked={false}
        onToggle={() => setActiveStep('date')} fillHeight={fill}
      >
        <div style={{ paddingTop: '0.25rem' }}>
          <MonthCalendar
            selected={selectedDate} onSelect={handleDateSelect}
            month={month} year={year}
            onMonthChange={(m, y) => { setMonth(m); setYear(y) }}
            maxDate={maxDate} closedDayOfWeeks={closedDayOfWeeks}
            partialDates={partialDates} busyDays={busyDays}
          />
        </div>
      </AccordionStep>

      <AccordionStep num={2} title="Horario"
        summary={selectedSlot ?? undefined}
        isOpen={activeStep === 'time'} isDone={!!selectedSlot} isLocked={!selectedDate}
        onToggle={() => { if (selectedDate) setActiveStep('time') }} fillHeight={fill}
      >
        {bookingBlocked ? (
          <p style={{ fontSize: 13, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', lineHeight: 1.6 }}>
            Ya tienes una cita activa. Reprograma desde{' '}
            <button onClick={() => navigate('/appointments')}
              style={{ background: 'none', border: 'none', padding: 0, color: 'var(--gold)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13 }}>
              Mis Citas
            </button>.
          </p>
        ) : availableBarbers.length === 0 && selectedDate ? (
          <p style={{ fontSize: 13, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)' }}>No hay barberos disponibles este día.</p>
        ) : selectedDate ? (
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
        ) : null}
      </AccordionStep>

      {allowBarberChoice && (
        <AccordionStep num={3} title="Barbero"
          summary={selectedBarber?.fullName ?? (selectedSlot ? 'Cualquier barbero' : undefined)}
          isOpen={activeStep === 'barber'} isDone={!!selectedSlot} isLocked={!selectedSlot}
          onToggle={() => { if (selectedSlot) setActiveStep('barber') }} fillHeight={fill}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.25rem' }}>
            {availableBarbers.map(b => (
              <BarberCard key={b.id} barber={b} selected={selectedBarber?.id === b.id} onClick={() => handleBarberSelect(b)} />
            ))}
            <BarberCard barber={null} selected={selectedBarber === null} onClick={() => handleBarberSelect(null)} />
          </div>
        </AccordionStep>
      )}

      <AccordionStep num={allowBarberChoice ? 4 : 3} title="Servicio"
        summary={selectedService ? `${selectedService.name} · ${selectedService.price}€` : undefined}
        isOpen={activeStep === 'service'} isDone={!!selectedService} isLocked={!selectedSlot}
        onToggle={() => { if (selectedSlot) setActiveStep('service') }} fillHeight={fill}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '0.25rem' }}>
          {loadingServices
            ? <p style={{ fontSize: 13, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)' }}>Cargando servicios…</p>
            : services.map(s => <ServiceRow key={s.id} service={s} selected={selectedService?.id === s.id} onClick={() => handleServiceSelect(s)} />)
          }
        </div>
      </AccordionStep>
    </>
  )

  // ── Summary card ─────────────────────────────────────────────────────────────

  const summaryCard = () => {
    const stepLabels = allowBarberChoice ? ['Fecha', 'Hora', 'Barbero', 'Servicio'] : ['Fecha', 'Hora', 'Servicio']
    const stepDone = allowBarberChoice
      ? [!!selectedDate, !!selectedSlot, !!selectedSlot, !!selectedService]
      : [!!selectedDate, !!selectedSlot, !!selectedService]
    const dateDay = selectedDate?.getDate()
    const dateDayName = selectedDate?.toLocaleDateString('es-ES', { weekday: 'long' }).toUpperCase()
    const dateMonthYear = selectedDate?.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()
    const barberInitials = selectedBarber ? getInitials(selectedBarber.fullName) : '✦'

    return (
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>

        {/* ── Header: label + ticket + stepper ── */}
        <div style={{
          padding: '1.25rem 1.25rem 1.1rem',
          borderBottom: '1px solid var(--line)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--gold)' }}>
              RESUMEN DE RESERVA
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-4)',
              background: 'var(--bg-3)', border: '1px solid var(--line)',
              borderRadius: 6, padding: '0.18rem 0.5rem', letterSpacing: '0.07em',
            }}>
              #{ticketNum}
            </span>
          </div>
          {/* Progress stepper */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {stepLabels.map((label, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < stepLabels.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: stepDone[i] ? 'var(--gold)' : 'var(--bg-4)',
                    border: `2px solid ${stepDone[i] ? 'var(--gold)' : 'var(--line-2)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.25s',
                  }}>
                    {stepDone[i]
                      ? <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      : <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fg-4)' }} />
                    }
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-ui)', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
                    color: stepDone[i] ? 'var(--fg-2)' : 'var(--fg-4)', textTransform: 'uppercase',
                    transition: 'color 0.25s', whiteSpace: 'nowrap',
                  }}>
                    {label}
                  </span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div style={{
                    flex: 1, height: 2, margin: '0 4px', marginBottom: 14, borderRadius: 1,
                    background: stepDone[i] ? 'var(--gold)' : 'var(--line-2)',
                    opacity: stepDone[i] ? 0.45 : 1, transition: 'background 0.25s',
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '1.1rem 1.25rem 0' }}>

          {/* Date ticket stub */}
          {selectedDate ? (
            <div style={{
              borderRadius: 12, border: '1px solid rgba(201,162,74,0.28)',
              background: 'rgba(201,162,74,0.04)', overflow: 'hidden', marginBottom: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                <div style={{
                  width: 68, flexShrink: 0, background: 'rgba(201,162,74,0.13)',
                  borderRight: '1px dashed rgba(201,162,74,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.875rem 0',
                }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 46, color: 'var(--gold)', lineHeight: 1 }}>
                    {dateDay}
                  </span>
                </div>
                <div style={{ flex: 1, padding: '0.875rem 1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--fg-0)', letterSpacing: '0.07em', lineHeight: 1 }}>
                    {dateDayName}
                  </div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.05em' }}>
                    {dateMonthYear}
                  </div>
                  <div style={{ marginTop: 3 }}>
                    {selectedSlot
                      ? <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700, color: 'var(--gold)', background: 'rgba(201,162,74,0.15)', border: '1px solid rgba(201,162,74,0.3)', borderRadius: 6, padding: '0.15rem 0.5rem', display: 'inline-block' }}>{selectedSlot}</span>
                      : <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--fg-4)' }}>Elige hora →</span>
                    }
                  </div>
                </div>
                {selectedSlot && (
                  <div style={{ padding: '0 0.875rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--ok)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ borderRadius: 12, border: '1px dashed var(--line)', background: 'var(--bg-3)', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0, background: 'var(--bg-4)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--fg-4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="16" y1="2" x2="16" y2="6" />
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--fg-4)', textTransform: 'uppercase', marginBottom: 3 }}>Fecha y hora</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--fg-4)' }}>Selecciona en el Paso 1</div>
              </div>
            </div>
          )}

          {/* Dashed divider */}
          <div style={{ borderTop: '1px dashed var(--line-2)', marginBottom: '1rem', opacity: 0.55 }} />

          {/* Barbero row */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: selectedSlot ? (selectedBarber ? 'rgba(123,79,255,0.14)' : 'rgba(201,162,74,0.1)') : 'var(--bg-4)',
              border: `1.5px solid ${selectedSlot ? (selectedBarber ? 'rgba(123,79,255,0.35)' : 'rgba(201,162,74,0.3)') : 'var(--line)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700,
              color: selectedSlot ? (selectedBarber ? 'var(--led-soft)' : 'var(--gold)') : 'var(--fg-4)',
              transition: 'all 0.2s',
            }}>
              {selectedSlot
                ? barberInitials
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--fg-4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--fg-3)', textTransform: 'uppercase', marginBottom: 3 }}>Barbero</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: selectedSlot ? 'var(--fg-0)' : 'var(--fg-4)', fontWeight: selectedSlot ? 500 : 400 }}>
                {selectedSlot ? (selectedBarber?.fullName ?? 'Cualquier barbero') : 'Sin seleccionar'}
              </div>
            </div>
          </div>

          {/* Dashed divider */}
          <div style={{ borderTop: '1px dashed var(--line-2)', marginBottom: '1rem', opacity: 0.55 }} />

          {/* Servicio row */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: selectedService ? 'rgba(201,162,74,0.1)' : 'var(--bg-4)',
              border: `1px solid ${selectedService ? 'rgba(201,162,74,0.3)' : 'var(--line)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={selectedService ? 'var(--gold)' : 'var(--fg-4)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--fg-3)', textTransform: 'uppercase', marginBottom: 3 }}>Servicio</div>
              {selectedService ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--fg-0)', fontWeight: 600, lineHeight: 1.3 }}>{selectedService.name}</div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>{selectedService.durationMinutes} min</div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--gold)', lineHeight: 1, flexShrink: 0 }}>{selectedService.price}€</span>
                </div>
              ) : (
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--fg-4)' }}>Sin seleccionar</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Perforated separator ── */}
        <div style={{
          margin: '1.25rem 0 0', height: 14,
          background: 'radial-gradient(circle at 50% 0%, var(--bg-0) 6px, transparent 6px)',
          backgroundSize: '20px 14px', backgroundRepeat: 'repeat-x',
          borderTop: '1px solid var(--line)',
        }} />

        {/* ── Footer ── */}
        <div style={{ padding: '1rem 1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* Loyalty */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.625rem 0.875rem', borderRadius: 10,
            background: selectedService ? 'rgba(201,162,74,0.07)' : 'var(--bg-3)',
            border: `1px solid ${selectedService ? 'rgba(201,162,74,0.2)' : 'var(--line)'}`,
            transition: 'all 0.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill={selectedService ? 'var(--gold)' : 'var(--fg-4)'} stroke="none" style={{ transition: 'fill 0.2s' }}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: selectedService ? 'var(--fg-1)' : 'var(--fg-4)', fontWeight: 500, transition: 'color 0.2s' }}>
                Puntos de fidelidad
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, color: selectedService ? 'var(--gold)' : 'var(--fg-4)', transition: 'color 0.2s' }}>
              {selectedService ? `+${selectedService.loyaltyPoints} pts` : '— pts'}
            </span>
          </div>

          {/* Total row: label left, price right */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: '0.75rem', borderTop: '1px solid var(--line)',
          }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--fg-3)', textTransform: 'uppercase' }}>
              {selectedService ? `Total · ${selectedService.durationMinutes} min` : 'Total'}
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 2.8vw, 38px)', color: selectedService ? 'var(--gold)' : 'var(--fg-4)', lineHeight: 1, transition: 'color 0.2s' }}>
              {selectedService ? `${selectedService.price}€` : '—'}
            </span>
          </div>

          {/* CTA */}
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
              transition: 'background 0.2s, color 0.2s',
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

      {/* ── DESKTOP: sticky-right, left scrolls naturally ────────────────── */}
      <div className="hidden lg:grid" style={{ gridTemplateColumns: '1fr 1fr', columnGap: '2rem', alignItems: 'start' }}>
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 2.4vw, 32px)', letterSpacing: '0.06em', color: 'var(--fg-0)', lineHeight: 1, margin: 0 }}>
              PEDIR CITA
            </h1>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--fg-3)', marginTop: 5, marginBottom: 0 }}>
              Completa cada paso para reservar tu cita
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {stepContent(false)}
          </div>
        </div>
        <div style={{ position: 'sticky', top: '1.5rem', maxHeight: 'calc(100dvh - 3rem)', overflowY: 'auto', scrollbarWidth: 'none' }}
          className="[&::-webkit-scrollbar]:hidden">
          {summaryCard()}
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
        {summaryCard()}
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
