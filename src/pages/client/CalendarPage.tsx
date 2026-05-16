import { useState, useMemo, useRef, useCallback } from 'react'
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

// ── Step badge ────────────────────────────────────────────────────────────────

function StepBadge({ step, label }: { step: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.45rem' }}>
      <span style={{
        fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700,
        color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase',
      }}>
        {step}
      </span>
      <span style={{ color: 'var(--fg-4)', fontSize: 9, lineHeight: 1 }}>·</span>
      <span style={{
        fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--fg-3)',
        letterSpacing: '0.12em', textTransform: 'uppercase',
      }}>
        {label}
      </span>
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
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--fg-0)' }}>
          {service.name}
        </div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--fg-3)', marginTop: 1 }}>
          {service.durationMinutes} min
        </div>
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

function BarberCard({ barber, selected, onClick }: {
  barber: Barber | null; selected: boolean; onClick: () => void
}) {
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { name: shopName, maxAdvanceDays, allowBarberChoice } = useShopContext()
  const maxDate = getMaxBookingDate(maxAdvanceDays)
  const today = new Date()

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
  const [showSlots, setShowSlots]         = useState(false)
  const [selectedSlot, setSelectedSlot]   = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedBarber, setSelectedBarber]   = useState<Barber | null>(null)
  const [confirmOpen, setConfirmOpen]         = useState(false)
  const [bookingError, setBookingError]       = useState<string | null>(null)
  const [bookingBlocked, setBookingBlocked]   = useState(false)

  // One ref per layout container — querySelector scopes lookup to the correct DOM tree
  const leftPanelRef  = useRef<HTMLDivElement>(null)
  const mobileWrapRef = useRef<HTMLDivElement>(null)

  // Scroll to a named section. Desktop: scrolls within the left panel container.
  // Mobile: scrollIntoView on the element inside the mobile wrapper.
  // Using querySelector per-container avoids the shared-ref problem when leftContent
  // is rendered in both desktop and mobile (Tailwind hidden != unmounted).
  const scrollTo = useCallback((id: string) => {
    setTimeout(() => {
      const isDesktop = window.innerWidth >= 1024
      if (isDesktop) {
        const container = leftPanelRef.current
        if (!container) return
        const el = container.querySelector(`[data-scroll="${id}"]`) as HTMLElement | null
        if (!el) return
        const cRect = container.getBoundingClientRect()
        const eRect = el.getBoundingClientRect()
        container.scrollTo({ top: Math.max(0, eRect.top - cRect.top + container.scrollTop - 8), behavior: 'smooth' })
      } else {
        const el = mobileWrapRef.current?.querySelector(`[data-scroll="${id}"]`) as HTMLElement | null
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 240)
  }, [])

  const scrollToTop = useCallback(() => {
    setTimeout(() => {
      if (window.innerWidth >= 1024) {
        leftPanelRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }, 80)
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

  // If today is selected, mark past time slots as taken (can't book in the past)
  const pastSlots = useMemo<string[]>(() => {
    if (!selectedDate) return []
    const sel = selectedDate
    const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0)
    const selMidnight = new Date(sel); selMidnight.setHours(0, 0, 0, 0)
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
  const serviceStep = allowBarberChoice ? 'Paso 4' : 'Paso 3'

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleDateSelect = (d: Date) => {
    if (d > maxDate) return
    if (closedDayOfWeeks.includes((d.getDay() + 6) % 7)) return
    if (selectedDate && d.toDateString() === selectedDate.toDateString()) {
      const willHide = showSlots
      setShowSlots(prev => !prev)
      if (willHide) scrollToTop()
      return
    }
    setSelectedDate(d)
    setSelectedSlot(null)
    setShowSlots(true)
    setBookingBlocked(hasActiveAppt)
    if (selectedBarber && !getAvailableBarbersForDate(d, schedule, blocks, allBarbers).some(b => b.id === selectedBarber.id))
      setSelectedBarber(null)
    scrollTo('slots')
  }

  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot)
    scrollTo(allowBarberChoice ? 'barber' : 'service')
  }

  const handleBarberSelect = (b: Barber | null) => { setSelectedBarber(b); scrollTo('service') }

  const handleServiceSelect = (s: Service) => {
    const isDeselect = selectedService?.id === s.id
    setSelectedService(isDeselect ? null : s)
    if (!isDeselect) scrollTo('summary')
  }

  const handleConfirm = () => {
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
          setShowSlots(false)
          navigate('/appointments', { replace: true })
        },
        onError: () => setBookingError('No se pudo guardar la cita. Inténtalo de nuevo.'),
      },
    )
  }

  // ── LEFT column content ──────────────────────────────────────────────────────
  // Rendered in both desktop and mobile — no React refs inside (use data-scroll instead)
  // so the same ref object isn't accidentally attached to the hidden DOM node.

  const leftContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Step 1 — Fecha */}
      <div>
        <StepBadge step="Paso 1" label="Fecha" />
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px, 2.8vw, 38px)', letterSpacing: '0.04em', color: 'var(--fg-0)', lineHeight: 1, margin: 0 }}>
          SELECCIONA UNA FECHA
        </h1>
      </div>

      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '0.875rem', maxWidth: 520 }}>
        <MonthCalendar
          selected={selectedDate}
          onSelect={handleDateSelect}
          month={month} year={year}
          onMonthChange={(m, y) => { setMonth(m); setYear(y) }}
          maxDate={maxDate}
          closedDayOfWeeks={closedDayOfWeeks}
          partialDates={partialDates}
          busyDays={busyDays}
        />
      </div>

      {/* Step 2 — Horario (only when a date is selected and slots visible) */}
      {selectedDate && showSlots && (
        <div data-scroll="slots">
          <StepBadge step="Paso 2" label="Horario" />
          {bookingBlocked ? (
            <p style={{ fontSize: 13, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', lineHeight: 1.6, marginTop: 4 }}>
              Ya tienes una cita activa. Reprograma desde{' '}
              <button onClick={() => navigate('/appointments')}
                style={{ background: 'none', border: 'none', padding: 0, color: 'var(--gold)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13 }}>
                Mis Citas
              </button>.
            </p>
          ) : availableBarbers.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', marginTop: 4 }}>
              No hay barberos disponibles este día.
            </p>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginTop: 6, marginBottom: '0.75rem' }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--fg-1)', textTransform: 'uppercase' }}>
                  {fmtHeader(selectedDate)}
                </span>
                <span style={{
                  padding: '0.15rem 0.5rem', borderRadius: 20,
                  background: 'rgba(201,162,74,0.1)', border: '1px solid rgba(201,162,74,0.25)',
                  fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, color: 'var(--gold)',
                }}>
                  {freeCount} disponibles
                </span>
              </div>
              <TimeSlots
                selected={selectedSlot}
                onSelect={handleSlotSelect}
                taken={takenSlots}
                fromTime={fromTime}
                toTime={toTime}
              />
            </>
          )}
        </div>
      )}

      {/* Hint: date selected but slots hidden */}
      {selectedDate && !showSlots && (
        <button
          onClick={() => { setShowSlots(true); scrollTo('slots') }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'none', border: '1px dashed var(--line)', borderRadius: 10,
            padding: '0.75rem 1rem', cursor: 'pointer', color: 'var(--fg-3)',
            fontFamily: 'var(--font-ui)', fontSize: 13,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          Ver horarios — {fmtLong(selectedDate)}
        </button>
      )}

      {/* Step 3 — Barbero (only after date + slot) */}
      {allowBarberChoice && selectedDate && selectedSlot && (
        <div data-scroll="barber">
          <StepBadge step="Paso 3" label="Barbero" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: 6 }}>
            {availableBarbers.map(b => (
              <BarberCard key={b.id} barber={b} selected={selectedBarber?.id === b.id}
                onClick={() => handleBarberSelect(b)} />
            ))}
            <BarberCard barber={null} selected={selectedBarber === null}
              onClick={() => handleBarberSelect(null)} />
          </div>
        </div>
      )}
    </div>
  )

  // ── Summary card (shared between desktop and mobile) ─────────────────────────
  // Always renders all rows so height stays stable (no layout jump when service is selected).

  const summaryCard = (
    <div data-scroll="summary" style={{
      background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 14,
      padding: '1rem 1.125rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
    }}>
      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--gold)', margin: 0 }}>
        RESUMEN
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 20 }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: selectedDate ? 'var(--fg-0)' : 'var(--fg-4)', fontWeight: selectedDate ? 500 : 400 }}>
          {selectedDate
            ? `${fmtLong(selectedDate)}${selectedSlot ? ' · ' + selectedSlot : ''}`
            : 'Sin fecha seleccionada'}
        </span>
        {selectedDate && selectedSlot && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: 8 }}>
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 20 }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: selectedService ? 'var(--fg-0)' : 'var(--fg-4)' }}>
          {selectedService
            ? <>{selectedService.name}<span style={{ color: 'var(--fg-3)' }}>{selectedBarber ? ` · ${selectedBarber.fullName}` : ' · Cualquier barbero'}</span></>
            : 'Sin servicio seleccionado'}
        </span>
        {selectedService && (
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--fg-1)', fontWeight: 500, flexShrink: 0, marginLeft: 8 }}>
            {selectedService.price}€
          </span>
        )}
      </div>
      <div style={{ height: 1, background: 'var(--line)' }} />
      {/* Price — same structure always, color/content changes */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: 'var(--fg-3)', marginBottom: '0.2rem', textTransform: 'uppercase' }}>
            {selectedService ? `Total · ${selectedService.durationMinutes} min` : 'Total'}
          </p>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 3vw, 40px)', color: selectedService ? 'var(--gold)' : 'var(--fg-4)', lineHeight: 1, transition: 'color 0.2s' }}>
            {selectedService ? `${selectedService.price}€` : '—'}
          </span>
        </div>
        <span style={{
          padding: '0.2rem 0.625rem', borderRadius: 20, flexShrink: 0,
          background: selectedService ? 'rgba(201,162,74,0.1)' : 'var(--bg-3)',
          border: `1px solid ${selectedService ? 'rgba(201,162,74,0.25)' : 'var(--line)'}`,
          fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600,
          color: selectedService ? 'var(--gold)' : 'var(--fg-4)', transition: 'all 0.2s',
        }}>
          {selectedService ? `+ ${selectedService.loyaltyPoints} pts` : '— pts'}
        </span>
      </div>
      <button
        disabled={!canConfirm}
        onClick={() => setConfirmOpen(true)}
        style={{
          width: '100%', padding: '0.875rem', borderRadius: 10, border: 'none',
          background: canConfirm ? 'var(--gold)' : 'var(--bg-4)',
          color: canConfirm ? '#000' : 'var(--fg-3)',
          fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700,
          cursor: canConfirm ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          transition: 'all 0.2s', boxShadow: canConfirm ? '0 4px 20px rgba(201,162,74,0.25)' : 'none',
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
  )

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <Helmet><title>Pedir cita — {shopName}</title></Helmet>

      {/* ── DESKTOP ──────────────────────────────────────────────────────────
          Two equal columns. Height is exactly the available content area:
            100dvh - topbar(57px) - main padding-top(24px) - main padding-bottom(24px)
          = calc(100dvh - 105px)  → no page scroll ever.
          Left panel scrolls internally. Right panel is a static flex column.   */}
      <div
        className="hidden lg:grid"
        style={{
          gridTemplateColumns: '1fr 1fr',
          columnGap: '3rem',
          height: 'calc(100dvh - 105px)',
          overflow: 'hidden',
        }}
      >
        {/* Left — scrolls inside the panel */}
        <div
          ref={leftPanelRef}
          style={{ overflowY: 'auto', paddingBottom: '1.5rem', scrollbarWidth: 'none' }}
          className="[&::-webkit-scrollbar]:hidden"
        >
          {leftContent}
        </div>

        {/* Right — flex column, never scrolls externally */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: '1rem' }}>
          {/* Header — pinned */}
          <div style={{ flexShrink: 0, paddingBottom: '1rem' }}>
            <StepBadge step={serviceStep} label="Servicio" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px, 2.8vw, 38px)', letterSpacing: '0.04em', color: 'var(--fg-0)', lineHeight: 1, margin: 0 }}>
              ELIGE TU SERVICIO
            </h2>
          </div>

          {/* Service list — grows to fill remaining space, scrolls internally if needed */}
          <div
            data-scroll="service"
            style={{ flex: '1 1 0', overflowY: 'auto', scrollbarWidth: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
            className="[&::-webkit-scrollbar]:hidden"
          >
            {loadingServices
              ? <p style={{ fontSize: 13, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)' }}>Cargando servicios…</p>
              : services.map(s => (
                <ServiceRow key={s.id} service={s}
                  selected={selectedService?.id === s.id}
                  onClick={() => handleServiceSelect(s)} />
              ))}
          </div>

          {/* Summary — always pinned at bottom */}
          <div style={{ flexShrink: 0, paddingTop: '0.875rem' }}>
            {summaryCard}
          </div>
        </div>
      </div>

      {/* ── MOBILE — stacked, page scrolls naturally ────────────────────── */}
      <div ref={mobileWrapRef} className="flex flex-col gap-10 lg:hidden" style={{ paddingBottom: '5rem' }}>
        {leftContent}
        <div style={{ height: 1, background: 'var(--line)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <StepBadge step={serviceStep} label="Servicio" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px, 2.8vw, 38px)', letterSpacing: '0.04em', color: 'var(--fg-0)', lineHeight: 1, margin: 0 }}>
              ELIGE TU SERVICIO
            </h2>
          </div>
          <div data-scroll="service" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {loadingServices
              ? <p style={{ fontSize: 13, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)' }}>Cargando servicios…</p>
              : services.map(s => (
                <ServiceRow key={s.id} service={s}
                  selected={selectedService?.id === s.id}
                  onClick={() => handleServiceSelect(s)} />
              ))}
          </div>
          {summaryCard}
        </div>
      </div>

      {/* ── Confirmation modal ───────────────────────────────────────────── */}
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
