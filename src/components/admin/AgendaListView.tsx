import { Icon } from '@/components/ui'

export interface AgendaItem {
  id: string
  startH: number
  startM: number
  durationMin: number
  client: string
  service: string
  barberId: string
  color: 'led' | 'brick' | 'gold'
}

interface Barber {
  id: string
  name: string
}

interface AgendaListViewProps {
  items: AgendaItem[]
  barbers: Barber[]
  date: Date
  onPrevDay: () => void
  onNextDay: () => void
  onSelect: (item: AgendaItem) => void
}

const COLOR_MAP = {
  led:   { dot: 'var(--led-soft)',    badge: 'rgba(123,79,255,0.15)' },
  brick: { dot: 'var(--brick-warm)',  badge: 'rgba(139,58,31,0.15)' },
  gold:  { dot: 'var(--gold)',        badge: 'rgba(201,162,74,0.15)' },
}

function fmtTime(h: number, m: number) {
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export function AgendaListView({ items, barbers, date, onPrevDay, onNextDay, onSelect }: AgendaListViewProps) {
  const sorted = [...items].sort((a, b) => a.startH * 60 + a.startM - (b.startH * 60 + b.startM))
  const dayLabel = `${DAY_NAMES[date.getDay()]}, ${date.getDate()} ${date.toLocaleDateString('es-ES', { month: 'long' })}`

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
    >
      {/* Day navigator */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--line)' }}
      >
        <button
          onClick={onPrevDay}
          className="flex items-center justify-center w-10 h-10 rounded-lg"
          style={{ border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-2)', cursor: 'pointer' }}
        >
          <Icon name="chevronL" size={16} />
        </button>

        <div className="text-center">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: '0.04em', color: 'var(--fg-0)' }}>
            {dayLabel}
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', marginTop: 1 }}>
            {sorted.length} {sorted.length === 1 ? 'cita' : 'citas'}
          </div>
        </div>

        <button
          onClick={onNextDay}
          className="flex items-center justify-center w-10 h-10 rounded-lg"
          style={{ border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-2)', cursor: 'pointer' }}
        >
          <Icon name="chevronR" size={16} />
        </button>
      </div>

      {/* Appointment list */}
      <div className="flex flex-col gap-2 p-3">
        {sorted.length === 0 && (
          <div className="py-8 text-center" style={{ fontSize: 13, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)' }}>
            Sin citas este día
          </div>
        )}

        {sorted.map(item => {
          const c = COLOR_MAP[item.color]
          const barberName = barbers.find(b => b.id === item.barberId)?.name ?? '—'
          const endH = item.startH + Math.floor((item.startM + item.durationMin) / 60)
          const endM = (item.startM + item.durationMin) % 60

          return (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="w-full text-left rounded-xl p-4 transition-opacity active:opacity-70"
              style={{
                background: c.badge,
                border: `1px solid ${c.dot}33`,
                cursor: 'pointer',
                minHeight: 72,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full shrink-0 mt-1"
                    style={{ background: c.dot, boxShadow: `0 0 6px ${c.dot}` }}
                  />
                  <div className="min-w-0">
                    <div
                      className="font-semibold text-sm truncate"
                      style={{ color: 'var(--fg-0)', fontFamily: 'var(--font-ui)' }}
                    >
                      {item.client}
                    </div>
                    <div
                      className="text-xs truncate mt-0.5"
                      style={{ color: 'var(--fg-2)', fontFamily: 'var(--font-ui)' }}
                    >
                      {item.service} · {barberName}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div
                    className="text-sm font-semibold"
                    style={{ color: c.dot, fontFamily: 'var(--font-mono, monospace)' }}
                  >
                    {fmtTime(item.startH, item.startM)}
                  </div>
                  <div
                    className="text-xs mt-0.5"
                    style={{ color: 'var(--fg-3)', fontFamily: 'var(--font-ui)' }}
                  >
                    hasta {fmtTime(endH, endM)}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
