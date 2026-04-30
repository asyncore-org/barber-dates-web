import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useShopContext } from '@/context/ShopContext'
import { getMaxBookingDate, getAvailableBarbersForDate, getBarbersAvailableForSlot } from '@/domain/booking'
import { DEFAULT_WEEKLY_SCHEDULE, type DayKey } from '@/domain/schedule'
import { MonthCalendar, TimeSlots, generateScheduleSlots } from '@/components/calendar'
import { ServiceCard } from '@/components/appointments'
import { Modal } from '@/components/ui'
import { useAuth } from '@/hooks'
import { useServices } from '@/hooks/useServices'
import { useBarbers } from '@/hooks/useBarbers'
import { useWeeklySchedule, useScheduleBlocks } from '@/hooks/useSchedule'
import { useClientAppointments, useCreateAppointment } from '@/hooks/useAppointments'
import type { Service } from '@/domain/service'
import type { Barber } from '@/domain/barber'

function fmt(date: Date) {
  return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
}

function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const CARD = 'bg-[var(--bg-2)] border border-[var(--line)] rounded-xl p-4 md:p-5'
const SECTION_LABEL = 'font-[var(--font-display)] text-[13px] tracking-widest text-[var(--fg-3)] mb-3.5'

const JS_TO_DAY: Record<number, DayKey> = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 0: 'sun' }

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
  const createAppointment = useCreateAppointment()

  const [month, setMonth] = useState(today.getMonth())
  const [year, setYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)

  const { fromTime, toTime } = useMemo(() => {
    if (!selectedDate) return { fromTime: '10:00', toTime: '19:00' }
    const key = JS_TO_DAY[selectedDate.getDay()]
    const day = schedule[key]
    return { fromTime: day.from || '10:00', toTime: day.to || '19:00' }
  }, [selectedDate, schedule])

  // While schedule is loading, show all active barbers unfiltered to avoid empty flicker
  const availableBarbers = useMemo<Barber[]>(() => {
    if (loadingSchedule || !selectedDate) return allBarbers.filter(b => b.isActive)
    return getAvailableBarbersForDate(selectedDate, schedule, blocks, allBarbers)
  }, [selectedDate, allBarbers, schedule, blocks, loadingSchedule])

  // Slots blocked because all available barbers (or just the selected one) are on break
  const breakBlockedSlots = useMemo<string[]>(() => {
    if (!selectedService) return []
    const barbersToCheck = selectedBarber ? [selectedBarber] : availableBarbers
    return generateScheduleSlots(fromTime, toTime).filter(slot =>
      getBarbersAvailableForSlot(slot, selectedService.durationMinutes, barbersToCheck).length === 0,
    )
  }, [selectedService, selectedBarber, availableBarbers, fromTime, toTime])

  const busyDays = useMemo<number[]>(() => {
    return myAppointments
      .filter(a => a.status !== 'cancelled' && a.status !== 'no_show')
      .filter(a => {
        const d = new Date(a.startTime)
        return d.getFullYear() === year && d.getMonth() === month
      })
      .map(a => new Date(a.startTime).getDate())
  }, [myAppointments, year, month])

  // Day-of-week numbers (0=Mon … 6=Sun ISO) that are fully closed per the weekly schedule
  const closedDayOfWeeks = useMemo<number[]>(() => {
    const DOW_MAP: Record<DayKey, number> = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 }
    return (Object.entries(schedule) as [DayKey, { open: boolean }][])
      .filter(([, day]) => !day.open)
      .map(([key]) => DOW_MAP[key])
  }, [schedule])

  // 'YYYY-MM-DD' dates with a partial schedule_block (has specific start_time, not an all-day block)
  const partialDates = useMemo<string[]>(() => {
    return blocks
      .filter(b => b.blockDate !== null && b.startTime !== null && !b.isRecurring)
      .map(b => b.blockDate!)
  }, [blocks])

  const handleMonthChange = (m: number, y: number) => {
    setMonth(m)
    setYear(y)
  }

  const handleDateSelect = (d: Date) => {
    if (d > maxDate) return
    const dayOfWeek = (d.getDay() + 6) % 7
    if (closedDayOfWeeks.includes(dayOfWeek)) return
    setSelectedDate(d)
    setSelectedSlot(null)
    if (selectedBarber) {
      const stillAvailable = getAvailableBarbersForDate(d, schedule, blocks, allBarbers)
        .some(b => b.id === selectedBarber.id)
      if (!stillAvailable) setSelectedBarber(null)
    }
  }

  const canConfirm = selectedDate && selectedSlot && selectedService && !createAppointment.isPending

  const handleConfirm = () => {
    if (!selectedDate || !selectedSlot || !selectedService || !user) return
    setBookingError(null)

    const [slotH, slotM] = selectedSlot.split(':').map(Number)
    const start = new Date(selectedDate)
    start.setHours(slotH, slotM, 0, 0)
    const end = new Date(start.getTime() + selectedService.durationMinutes * 60_000)

    const barberId = selectedBarber?.id ?? availableBarbers[0]?.id ?? ''

    createAppointment.mutate(
      {
        clientId: user.id,
        barberId,
        serviceId: selectedService.id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
      {
        onSuccess: () => {
          setConfirmOpen(false)
          setSelectedDate(null)
          setSelectedSlot(null)
          setSelectedService(null)
          setSelectedBarber(null)
          navigate('/appointments', { replace: true })
        },
        onError: () => {
          setBookingError('No se pudo guardar la cita. Inténtalo de nuevo.')
        },
      },
    )
  }

  return (
    <>
      <Helmet>
        <title>Pedir cita — {shopName}</title>
      </Helmet>

      <div className="grid grid-cols-1 md:grid-cols-[1.4fr_0.9fr] gap-4 md:gap-6 items-start">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          {/* Calendar card */}
          <div className={CARD}>
            <div className={SECTION_LABEL}>SELECCIONAR FECHA</div>
            <MonthCalendar
              selected={selectedDate}
              onSelect={handleDateSelect}
              month={month}
              year={year}
              onMonthChange={handleMonthChange}
              maxDate={maxDate}
              closedDayOfWeeks={closedDayOfWeeks}
              partialDates={partialDates}
              busyDays={busyDays}
            />
          </div>

          {/* Time slots — only shown when there are available barbers */}
          {selectedDate && availableBarbers.length === 0 && (
            <div className={CARD}>
              <div style={{ color: 'var(--fg-2)', fontSize: 13, fontFamily: 'var(--font-ui)', padding: '0.5rem 0' }}>
                No hay barberos disponibles para este día.
              </div>
            </div>
          )}
          {selectedDate && availableBarbers.length > 0 && (
            <div className={CARD}>
              <div className={SECTION_LABEL}>
                HORA — {fmt(selectedDate).toUpperCase()}
              </div>
              <TimeSlots
                selected={selectedSlot}
                onSelect={setSelectedSlot}
                taken={breakBlockedSlots}
                fromTime={fromTime}
                toTime={toTime}
              />
            </div>
          )}

          {/* Barbero — hidden when allowBarberChoice is disabled */}
          {allowBarberChoice && (
            <div className={CARD}>
              <div className={SECTION_LABEL}>BARBERO</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setSelectedBarber(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.6rem 1rem', borderRadius: 8, minHeight: 44,
                    border: selectedBarber === null ? '1px solid var(--led-soft)' : '1px solid var(--line)',
                    background: selectedBarber === null ? 'rgba(123,79,255,0.1)' : 'var(--bg-3)',
                    color: selectedBarber === null ? 'var(--fg-0)' : 'var(--fg-1)',
                    cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-ui)',
                    transition: 'all 0.12s',
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: selectedBarber === null ? 'var(--led)' : 'var(--bg-4)',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 13, color: selectedBarber === null ? '#fff' : 'var(--fg-2)',
                  }}>
                    ✦
                  </div>
                  Cualquier barbero
                </button>

                {availableBarbers.map(b => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBarber(b)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.6rem 1rem', borderRadius: 8, minHeight: 44,
                      border: selectedBarber?.id === b.id ? '1px solid var(--led-soft)' : '1px solid var(--line)',
                      background: selectedBarber?.id === b.id ? 'rgba(123,79,255,0.1)' : 'var(--bg-3)',
                      color: selectedBarber?.id === b.id ? 'var(--fg-0)' : 'var(--fg-1)',
                      cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-ui)',
                      transition: 'all 0.12s',
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'var(--bg-4)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--fg-1)',
                    }}>
                      {getInitials(b.fullName)}
                    </div>
                    {b.fullName}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Services */}
          <div className={CARD}>
            <div className={SECTION_LABEL}>SERVICIO</div>
            {loadingServices ? (
              <div style={{ color: 'var(--fg-3)', fontSize: 13, fontFamily: 'var(--font-ui)', padding: '0.5rem 0' }}>
                Cargando servicios…
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {services.map(s => (
                  <ServiceCard
                    key={s.id}
                    service={s}
                    selected={selectedService?.id === s.id}
                    onClick={() => setSelectedService(s)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className={CARD}>
            <div className={SECTION_LABEL}>RESUMEN</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {[
                { label: 'Fecha',   value: selectedDate ? fmt(selectedDate) : '—' },
                { label: 'Hora',    value: selectedSlot ?? '—' },
                { label: 'Servicio', value: selectedService?.name ?? '—' },
                { label: 'Barbero', value: selectedBarber?.fullName ?? 'Cualquier barbero' },
                { label: 'Precio',  value: selectedService ? `${selectedService.price}€` : '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)' }}>{label}</span>
                  <span style={{ fontSize: 13, color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontWeight: 500 }}>{value}</span>
                </div>
              ))}

              {selectedService && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.375rem', borderTop: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 12, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)' }}>Ganarás</span>
                  <span style={{ fontSize: 13, color: 'var(--gold)', fontFamily: 'var(--font-ui)', fontWeight: 600 }}>
                    ★ {selectedService.loyaltyPoints} pts
                  </span>
                </div>
              )}
            </div>
            <button
              disabled={!canConfirm}
              onClick={() => setConfirmOpen(true)}
              style={{
                width: '100%', padding: '0.875rem',
                borderRadius: 8, border: 'none',
                background: canConfirm ? 'var(--led)' : 'var(--bg-4)',
                color: canConfirm ? '#fff' : 'var(--fg-3)',
                fontFamily: 'var(--font-display)', fontSize: 16,
                letterSpacing: '0.08em', cursor: canConfirm ? 'pointer' : 'default',
                boxShadow: canConfirm ? 'var(--glow-led)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              CONFIRMAR CITA
            </button>
          </div>
        </div>
      </div>

      {confirmOpen && <Modal
        onClose={() => setConfirmOpen(false)}
        title="Confirmar cita"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Fecha',    value: selectedDate ? fmt(selectedDate) : '' },
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
        </div>
        {bookingError && (
          <div style={{ color: 'var(--err)', fontSize: 13, fontFamily: 'var(--font-ui)', marginBottom: '0.75rem', textAlign: 'center' }}>
            {bookingError}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setConfirmOpen(false)}
            disabled={createAppointment.isPending}
            style={{
              flex: 1, padding: '0.75rem', borderRadius: 8,
              border: '1px solid var(--line)', background: 'transparent',
              color: 'var(--fg-1)', fontFamily: 'var(--font-ui)', cursor: 'pointer',
              minHeight: 44, opacity: createAppointment.isPending ? 0.5 : 1,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={createAppointment.isPending}
            style={{
              flex: 1, padding: '0.75rem', borderRadius: 8,
              border: 'none', background: 'var(--led)', color: '#fff',
              fontFamily: 'var(--font-ui)', fontWeight: 600,
              cursor: createAppointment.isPending ? 'default' : 'pointer',
              boxShadow: createAppointment.isPending ? 'none' : 'var(--glow-led)',
              opacity: createAppointment.isPending ? 0.7 : 1,
              minHeight: 44,
            }}
          >
            {createAppointment.isPending ? 'Guardando…' : 'Confirmar'}
          </button>
        </div>
      </Modal>}
    </>
  )
}
