import { useState } from 'react'
import { Modal } from '@/components/ui'
import { MonthCalendar, TimeSlots } from '@/components/calendar'
import { useServices } from '@/hooks/useServices'
import { useBarbers } from '@/hooks/useBarbers'
import type { WeekAppt, RescheduleUpdate } from './types'

function calcInitials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?'
}

interface Props {
  appt: WeekAppt
  weekStart: Date
  onClose: () => void
  onConfirm: (update: RescheduleUpdate) => void
}

const LABEL: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 11,
  letterSpacing: '0.12em',
  color: 'var(--fg-3)',
  marginBottom: '0.5rem',
}

export function RescheduleModal({ appt, weekStart, onClose, onConfirm }: Props) {
  const { data: services = [] } = useServices()
  const { data: barbers = [] } = useBarbers()
  const activeServices = services.filter(s => s.isActive)
  const activeBarbers = barbers.filter(b => b.isActive)

  const initialDate = new Date(weekStart)
  initialDate.setDate(initialDate.getDate() + appt.day)

  const initialSlot = `${appt.startH.toString().padStart(2, '0')}:${appt.startM.toString().padStart(2, '0')}`

  const [serviceId, setServiceId] = useState<string>(
    () => activeServices.find(s => s.name === appt.service)?.id ?? activeServices[0]?.id ?? ''
  )
  const [barberId, setBarberId] = useState(appt.barberId)
  const [date, setDate] = useState<Date | null>(initialDate)
  const [slot, setSlot] = useState<string | null>(initialSlot)
  const [month, setMonth] = useState(initialDate.getMonth())
  const [year, setYear] = useState(initialDate.getFullYear())

  const selectedService = activeServices.find(s => s.id === serviceId)
  const selectedBarber = activeBarbers.find(b => b.id === barberId)
  const canConfirm = !!(serviceId && barberId && date && slot)

  const handleConfirm = () => {
    if (!date || !slot) return
    onConfirm({ serviceId, barberId, date, slot })
  }

  return (
    <Modal title="Reprogramar cita" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Cita actual — solo lectura */}
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: 8,
          background: 'var(--bg-3)',
          border: '1px solid var(--line)',
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          color: 'var(--fg-2)',
        }}>
          <span style={{ fontWeight: 600, color: 'var(--fg-0)' }}>{appt.client}</span>
          {' · '}{initialSlot}{' · '}{appt.service}
        </div>

        {/* Servicio */}
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

        {/* Barbero */}
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

        {/* Fecha */}
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

        {/* Hora */}
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

        {/* Resumen */}
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
            <span><strong style={{ color: 'var(--fg-0)' }}>{appt.client}</strong></span>
            <span>
              {selectedService.name} · {selectedBarber.fullName}
              {' · '}
              {date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} {slot}
            </span>
          </div>
        )}

        {/* Botón confirmar */}
        <button
          disabled={!canConfirm}
          onClick={handleConfirm}
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
          GUARDAR CAMBIOS
        </button>
      </div>
    </Modal>
  )
}
