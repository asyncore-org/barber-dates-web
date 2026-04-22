import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { MonthCalendar } from '@/components/calendar'
import { TimeSlots } from '@/components/calendar'
import { LoyaltyCard } from '@/components/loyalty'
import { ServiceCard } from '@/components/appointments'
import { Modal } from '@/components/ui'
import { MOCK_SERVICES, MOCK_BARBERS, MOCK_LOYALTY, MOCK_TAKEN_SLOTS } from '@/lib/mock-data'
import type { MockService, MockBarber } from '@/lib/mock-data'

function fmt(date: Date) {
  return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function CalendarPage() {
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth())
  const [year, setYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState<MockService | null>(null)
  const [selectedBarber, setSelectedBarber] = useState<MockBarber>(MOCK_BARBERS[0])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const handleMonthChange = (m: number, y: number) => {
    setMonth(m)
    setYear(y)
  }

  const canConfirm = selectedDate && selectedSlot && selectedService

  const handleConfirm = () => {
    setConfirmOpen(false)
    setConfirmed(true)
    setTimeout(() => setConfirmed(false), 3000)
    setSelectedDate(null)
    setSelectedSlot(null)
    setSelectedService(null)
  }

  return (
    <>
      <Helmet>
        <title>Pedir cita — Gio Barber Shop</title>
      </Helmet>

      {confirmed && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 200,
          background: 'var(--ok)', color: '#fff',
          padding: '0.75rem 1.25rem', borderRadius: 8,
          fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600,
          boxShadow: 'var(--shadow-md)',
        }}>
          ✓ Cita confirmada correctamente
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.9fr', gap: '1.5rem', alignItems: 'start' }}
        className="calendar-grid">
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Calendar card */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '1.25rem' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.12em', color: 'var(--fg-3)', marginBottom: '1rem' }}>
              SELECCIONAR FECHA
            </div>
            <MonthCalendar
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={month}
              year={year}
              onMonthChange={handleMonthChange}
            />
          </div>

          {/* Time slots */}
          {selectedDate && (
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '1.25rem' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.12em', color: 'var(--fg-3)', marginBottom: '1rem' }}>
                HORA — {fmt(selectedDate).toUpperCase()}
              </div>
              <TimeSlots
                selected={selectedSlot}
                onSelect={setSelectedSlot}
                taken={MOCK_TAKEN_SLOTS}
              />
            </div>
          )}

          {/* Barbero */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '1.25rem' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.12em', color: 'var(--fg-3)', marginBottom: '0.875rem' }}>
              BARBERO
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {MOCK_BARBERS.filter(b => b.active).map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBarber(b)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.4rem 0.75rem', borderRadius: 8,
                    border: selectedBarber.id === b.id ? '1px solid var(--led-soft)' : '1px solid var(--line)',
                    background: selectedBarber.id === b.id ? 'rgba(123,79,255,0.1)' : 'var(--bg-3)',
                    color: selectedBarber.id === b.id ? 'var(--fg-0)' : 'var(--fg-1)',
                    cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-ui)',
                    transition: 'all 0.12s',
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--bg-4)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--fg-1)',
                  }}>
                    {b.initials}
                  </div>
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <LoyaltyCard
            points={MOCK_LOYALTY.points}
            target={MOCK_LOYALTY.target}
            stamps={MOCK_LOYALTY.stamps}
            memberCode={MOCK_LOYALTY.memberCode}
          />

          {/* Services */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '1.25rem' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.12em', color: 'var(--fg-3)', marginBottom: '0.875rem' }}>
              SERVICIO
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {MOCK_SERVICES.map(s => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  selected={selectedService?.id === s.id}
                  onClick={() => setSelectedService(s)}
                />
              ))}
            </div>
          </div>

          {/* Summary */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '1.25rem' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.12em', color: 'var(--fg-3)', marginBottom: '0.875rem' }}>
              RESUMEN
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {[
                { label: 'Fecha', value: selectedDate ? fmt(selectedDate) : '—' },
                { label: 'Hora', value: selectedSlot ?? '—' },
                { label: 'Servicio', value: selectedService?.name ?? '—' },
                { label: 'Barbero', value: selectedBarber.name },
                { label: 'Precio', value: selectedService ? `${selectedService.price}€` : '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)' }}>{label}</span>
                  <span style={{ fontSize: 13, color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>
            <button
              disabled={!canConfirm}
              onClick={() => setConfirmOpen(true)}
              style={{
                width: '100%', padding: '0.75rem',
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

      {/* Confirm modal */}
      {confirmOpen && <Modal
        onClose={() => setConfirmOpen(false)}
        title="Confirmar cita"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Fecha', value: selectedDate ? fmt(selectedDate) : '' },
            { label: 'Hora', value: selectedSlot ?? '' },
            { label: 'Servicio', value: selectedService?.name ?? '' },
            { label: 'Barbero', value: selectedBarber.name },
            { label: 'Duración', value: selectedService ? `${selectedService.duration} min` : '' },
            { label: 'Precio', value: selectedService ? `${selectedService.price}€` : '' },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)' }}>{label}</span>
              <span style={{ fontSize: 13, color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontWeight: 500 }}>{value}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setConfirmOpen(false)}
            style={{ flex: 1, padding: '0.65rem', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-1)', fontFamily: 'var(--font-ui)', cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            style={{ flex: 1, padding: '0.65rem', borderRadius: 8, border: 'none', background: 'var(--led)', color: '#fff', fontFamily: 'var(--font-ui)', fontWeight: 600, cursor: 'pointer', boxShadow: 'var(--glow-led)' }}
          >
            Confirmar
          </button>
        </div>
      </Modal>}

      <style>{`
        @media (max-width: 768px) {
          .calendar-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
