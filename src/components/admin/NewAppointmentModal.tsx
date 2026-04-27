import { useState } from 'react'
import { Modal } from '@/components/ui'
import { MonthCalendar, TimeSlots } from '@/components/calendar'
import { useServices } from '@/hooks/useServices'
import { useBarbers } from '@/hooks/useBarbers'

function calcInitials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?'
}

const DEMO_EMAILS = [
  'carlos.martinez@gmail.com',
  'ruben.garcia@hotmail.com',
  'javier.perez@outlook.com',
  'miguel.angel@gmail.com',
  'toni.rodriguez@gmail.com',
  'alex.fernandez@icloud.com',
  'marc.vila@gmail.com',
  'sergio.lopez@yahoo.es',
]

interface Props {
  onClose: () => void
  onConfirm: () => void
}

export function NewAppointmentModal({ onClose, onConfirm }: Props) {
  const today = new Date()
  const { data: services = [] } = useServices()
  const { data: barbers = [] } = useBarbers()
  const activeBarbers = barbers.filter(b => b.isActive)
  const activeServices = services.filter(s => s.isActive)

  const [email, setEmail] = useState('')
  const [serviceId, setServiceId] = useState<string | null>(null)
  const [barberId, setBarberId] = useState<string>(() => activeBarbers[0]?.id ?? '')
  const [date, setDate] = useState<Date | null>(null)
  const [slot, setSlot] = useState<string | null>(null)
  const [month, setMonth] = useState(today.getMonth())
  const [year, setYear] = useState(today.getFullYear())

  const selectedService = activeServices.find(s => s.id === serviceId) ?? null
  const selectedBarber = activeBarbers.find(b => b.id === barberId)
  const canConfirm = email.trim().length > 3 && serviceId && barberId && date && slot

  const emailSuggestions = email.length > 1
    ? DEMO_EMAILS.filter(e => e.toLowerCase().includes(email.toLowerCase()))
    : []

  const LABEL = {
    fontFamily: 'var(--font-display)',
    fontSize: 11,
    letterSpacing: '0.12em',
    color: 'var(--fg-3)',
    marginBottom: '0.5rem',
  } as React.CSSProperties

  return (
    <Modal title="Nueva cita" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Client email */}
        <div>
          <div style={LABEL}>CLIENTE (EMAIL)</div>
          <input
            list="client-suggestions"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="email@ejemplo.com"
            style={{
              width: '100%',
              padding: '0.75rem',
              minHeight: 44,
              borderRadius: 8,
              border: '1px solid var(--line)',
              background: 'var(--bg-3)',
              color: 'var(--fg-0)',
              fontFamily: 'var(--font-ui)',
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {emailSuggestions.length > 0 && (
            <datalist id="client-suggestions">
              {emailSuggestions.map(e => <option key={e} value={e} />)}
            </datalist>
          )}
        </div>

        {/* Service */}
        <div>
          <div style={LABEL}>SERVICIO</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {activeServices.map(s => (
              <button
                key={s.id}
                onClick={() => setServiceId(s.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.875rem',
                  minHeight: 44,
                  borderRadius: 8,
                  border: serviceId === s.id ? '1px solid var(--led-soft)' : '1px solid var(--line)',
                  background: serviceId === s.id ? 'rgba(123,79,255,0.1)' : 'var(--bg-3)',
                  color: 'var(--fg-0)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.12s',
                }}
              >
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500 }}>{s.name}</span>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--fg-2)' }}>
                  {s.durationMinutes} min · {s.price}€
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Barber */}
        <div>
          <div style={LABEL}>BARBERO</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {activeBarbers.map(b => (
              <button
                key={b.id}
                onClick={() => setBarberId(b.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.875rem',
                  minHeight: 40,
                  borderRadius: 8,
                  border: barberId === b.id ? '1px solid var(--led-soft)' : '1px solid var(--line)',
                  background: barberId === b.id ? 'rgba(123,79,255,0.1)' : 'var(--bg-3)',
                  color: barberId === b.id ? 'var(--fg-0)' : 'var(--fg-1)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: 'var(--font-ui)',
                  transition: 'all 0.12s',
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: 'var(--bg-4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: 'var(--fg-1)',
                }}>
                  {calcInitials(b.fullName)}
                </div>
                {b.fullName}
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div>
          <div style={LABEL}>FECHA</div>
          <MonthCalendar
            selected={date}
            onSelect={d => { setDate(d); setSlot(null) }}
            month={month}
            year={year}
            onMonthChange={(m, y) => { setMonth(m); setYear(y) }}
          />
        </div>

        {/* Time slots */}
        {date && (
          <div>
            <div style={LABEL}>HORA</div>
            <TimeSlots
              selected={slot}
              onSelect={setSlot}
              taken={[]}
            />
          </div>
        )}

        {/* Summary pill */}
        {canConfirm && selectedService && selectedBarber && date && slot && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: 8,
            background: 'rgba(123,79,255,0.07)',
            border: '1px solid rgba(123,79,255,0.2)',
            fontFamily: 'var(--font-ui)',
            fontSize: 13,
            color: 'var(--fg-1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
          }}>
            <span><strong style={{ color: 'var(--fg-0)' }}>{email}</strong></span>
            <span>{selectedService.name} · {selectedBarber.fullName} · {date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} {slot}</span>
          </div>
        )}

        {/* Confirm button */}
        <button
          disabled={!canConfirm}
          onClick={onConfirm}
          style={{
            width: '100%',
            padding: '0.875rem',
            minHeight: 48,
            borderRadius: 8,
            border: 'none',
            background: canConfirm ? 'var(--led)' : 'var(--bg-4)',
            color: canConfirm ? '#fff' : 'var(--fg-3)',
            fontFamily: 'var(--font-display)',
            fontSize: 15,
            letterSpacing: '0.06em',
            cursor: canConfirm ? 'pointer' : 'default',
            boxShadow: canConfirm ? 'var(--glow-led)' : 'none',
            transition: 'all 0.15s',
          }}
        >
          CONFIRMAR CITA
        </button>
      </div>
    </Modal>
  )
}
