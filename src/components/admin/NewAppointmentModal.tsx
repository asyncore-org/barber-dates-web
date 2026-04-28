import { useState } from 'react'
import { Modal } from '@/components/ui'
import { MonthCalendar, TimeSlots } from '@/components/calendar'
import { useServices } from '@/hooks/useServices'
import { useBarbers } from '@/hooks/useBarbers'

function calcInitials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?'
}

export interface NewAppointmentData {
  email: string
  serviceId: string
  barberId: string
  date: Date
  slot: string
}

interface Props {
  onClose: () => void
  onConfirm: (data: NewAppointmentData) => void
  errorMessage?: string
  isPending?: boolean
}

export function NewAppointmentModal({ onClose, onConfirm, errorMessage, isPending }: Props) {
  const today = new Date()
  const { data: services = [] } = useServices()
  const { data: barbers = [] } = useBarbers()
  const activeBarbers = barbers.filter(b => b.isActive)
  const activeServices = services.filter(s => s.isActive)

  const [email, setEmail] = useState('')
  const [serviceId, setServiceId] = useState<string | null>(null)
  const [barberId, setBarberId] = useState<string>('__any__')
  const [date, setDate] = useState<Date | null>(null)
  const [slot, setSlot] = useState<string | null>(null)
  const [month, setMonth] = useState(today.getMonth())
  const [year, setYear] = useState(today.getFullYear())

  const selectedService = activeServices.find(s => s.id === serviceId) ?? null
  const selectedBarber = barberId !== '__any__' ? activeBarbers.find(b => b.id === barberId) : null
  const canConfirm = email.trim().length > 3 && serviceId != null && barberId !== '' && date != null && slot != null && !isPending

  const LABEL = {
    fontFamily: 'var(--font-display)',
    fontSize: 11,
    letterSpacing: '0.12em',
    color: 'var(--fg-3)',
    marginBottom: '0.5rem',
  } as React.CSSProperties

  const barberBtnStyle = (id: string): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.875rem',
    minHeight: 40,
    borderRadius: 8,
    border: barberId === id ? '1px solid var(--led-soft)' : '1px solid var(--line)',
    background: barberId === id ? 'rgba(123,79,255,0.1)' : 'var(--bg-3)',
    color: barberId === id ? 'var(--fg-0)' : 'var(--fg-1)',
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: 'var(--font-ui)',
    transition: 'all 0.12s',
  })

  return (
    <Modal title="Nueva cita" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Client email */}
        <div>
          <div style={LABEL}>CLIENTE (EMAIL)</div>
          <input
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
            <button onClick={() => setBarberId('__any__')} style={barberBtnStyle('__any__')}>
              Cualquier barbero
            </button>
            {activeBarbers.map(b => (
              <button key={b.id} onClick={() => setBarberId(b.id)} style={barberBtnStyle(b.id)}>
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
        {canConfirm && selectedService && date && slot && (
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
            <span>
              {selectedService.name} ·{' '}
              {selectedBarber ? selectedBarber.fullName : 'Barbero disponible aleatorio'} ·{' '}
              {date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} {slot}
            </span>
          </div>
        )}

        {/* Error */}
        {errorMessage && (
          <p style={{ color: 'var(--danger)', fontSize: 13, fontFamily: 'var(--font-ui)', margin: 0 }}>
            {errorMessage}
          </p>
        )}

        {/* Confirm button */}
        <button
          disabled={!canConfirm}
          onClick={() => {
            if (!canConfirm || !serviceId || !date || !slot) return
            onConfirm({ email: email.trim(), serviceId, barberId, date, slot })
          }}
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
          {isPending ? 'Creando…' : 'CONFIRMAR CITA'}
        </button>
      </div>
    </Modal>
  )
}
