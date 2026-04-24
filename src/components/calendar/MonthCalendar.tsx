import { Icon } from '@/components/ui'

interface MonthCalendarProps {
  selected: Date | null
  onSelect: (date: Date) => void
  month: number
  year: number
  onMonthChange: (month: number, year: number) => void
  busyDays?: number[]
}

const DAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startDow = (first.getDay() + 6) % 7
  const days: Array<{ day: number; current: boolean }> = []
  for (let i = 0; i < startDow; i++) days.push({ day: 0, current: false })
  for (let d = 1; d <= last.getDate(); d++) days.push({ day: d, current: true })
  return days
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function MonthCalendar({ selected, onSelect, month, year, onMonthChange, busyDays = [] }: MonthCalendarProps) {
  const today = new Date()
  const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const days = getMonthDays(year, month)

  const prev = () => {
    if (month === 0) onMonthChange(11, year - 1)
    else onMonthChange(month - 1, year)
  }
  const next = () => {
    if (month === 11) onMonthChange(0, year + 1)
    else onMonthChange(month + 1, year)
  }
  const goToday = () => onMonthChange(today.getMonth(), today.getFullYear())

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={prev} style={navBtn}><Icon name="chevronL" size={14} /></button>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--fg-0)', letterSpacing: '0.06em' }}>
            {MONTH_NAMES[month]} {year}
          </span>
          <button onClick={next} style={navBtn}><Icon name="chevronR" size={14} /></button>
        </div>
        <button onClick={goToday} style={{ ...navBtn, width: 'auto', padding: '0 0.75rem', fontSize: 12, fontFamily: 'var(--font-ui)' }}>
          Hoy
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--fg-3)', fontWeight: 600, fontFamily: 'var(--font-ui)', padding: '0.25rem 0' }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {days.map(({ day, current }, i) => {
          if (!current) return <div key={`e${i}`} />
          const date = new Date(year, month, day)
          const isPast = date < todayNorm
          const isToday = date.getTime() === todayNorm.getTime()
          const isSelected = selected
            ? selected.getFullYear() === year && selected.getMonth() === month && selected.getDate() === day
            : false
          const isBusy = busyDays.includes(day)

          return (
            <button
              key={day}
              disabled={isPast}
              onClick={() => onSelect(date)}
              style={{
                position: 'relative',
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 6,
                border: isToday ? '1px solid var(--led)' : '1px solid transparent',
                background: isSelected ? '#fff' : 'transparent',
                color: isPast ? 'var(--fg-3)' : isSelected ? '#0a0a0b' : 'var(--fg-0)',
                fontSize: 13,
                fontFamily: 'var(--font-ui)',
                cursor: isPast ? 'default' : 'pointer',
                boxShadow: isToday ? 'var(--glow-led)' : 'none',
                opacity: isPast ? 0.4 : 1,
                transition: 'all 0.12s',
              }}
            >
              {day}
              {isBusy && !isSelected && (
                <div style={{
                  position: 'absolute',
                  bottom: 3,
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: 'var(--brick)',
                }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const navBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  height: 40,
  borderRadius: 8,
  border: '1px solid var(--line)',
  background: 'transparent',
  color: 'var(--fg-2)',
  cursor: 'pointer',
}
