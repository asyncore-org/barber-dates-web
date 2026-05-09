import { Icon } from '@/components/ui'

interface MonthCalendarProps {
  selected: Date | null
  onSelect: (date: Date) => void
  month: number
  year: number
  onMonthChange: (month: number, year: number) => void
  busyDays?: number[]
  maxDate?: Date
  /** Day-of-week numbers (0=Mon … 6=Sun, ISO) that are fully closed. Rendered as disabled + line-through. */
  closedDayOfWeeks?: number[]
  /** 'YYYY-MM-DD' dates with a partial schedule block. Rendered with an orange indicator dot. */
  partialDates?: string[]
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

export function MonthCalendar({ selected, onSelect, month, year, onMonthChange, busyDays = [], maxDate, closedDayOfWeeks = [], partialDates = [] }: MonthCalendarProps) {
  const today = new Date()
  const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const maxNorm = maxDate ? new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()) : null

  const days = getMonthDays(year, month)

  const isAtCurrentMonth = month === today.getMonth() && year === today.getFullYear()
  const isNextMonthBeyondMax = maxNorm ? new Date(year, month + 1, 1) > maxNorm : false

  const prev = () => {
    if (isAtCurrentMonth) return
    if (month === 0) onMonthChange(11, year - 1)
    else onMonthChange(month - 1, year)
  }
  const next = () => {
    if (isNextMonthBeyondMax) return
    if (month === 11) onMonthChange(0, year + 1)
    else onMonthChange(month + 1, year)
  }
  const goToday = () => {
    if (!isAtCurrentMonth) onMonthChange(today.getMonth(), today.getFullYear())
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <button
            onClick={prev}
            disabled={isAtCurrentMonth}
            className="cal-nav-btn"
          >
            <Icon name="chevronL" size={14} />
          </button>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--fg-0)', letterSpacing: '0.06em', minWidth: 160, textAlign: 'center' }}>
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            onClick={next}
            disabled={isNextMonthBeyondMax}
            className="cal-nav-btn"
          >
            <Icon name="chevronR" size={14} />
          </button>
        </div>
        <button
          onClick={goToday}
          disabled={isAtCurrentMonth}
          className="cal-nav-btn"
          style={{ width: 'auto', padding: '0 0.875rem', fontSize: 12, fontFamily: 'var(--font-ui)' }}
        >
          Hoy
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--fg-3)', fontWeight: 700, fontFamily: 'var(--font-ui)', padding: '0.3rem 0', letterSpacing: '0.05em' }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {days.map(({ day, current }, i) => {
          if (!current) return <div key={`e${i}`} />
          const date = new Date(year, month, day)
          const isPast = date < todayNorm
          const isBeyondMax = maxNorm ? date > maxNorm : false
          // 0=Mon … 6=Sun (ISO convention matching closedDayOfWeeks)
          const dayOfWeek = (date.getDay() + 6) % 7
          const isClosed = closedDayOfWeeks.includes(dayOfWeek)
          const isDisabled = isPast || isBeyondMax || isClosed
          const isToday = date.getTime() === todayNorm.getTime()
          const isSelected = selected
            ? selected.getFullYear() === year && selected.getMonth() === month && selected.getDate() === day
            : false
          const isBusy = busyDays.includes(day)
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isPartial = !isClosed && partialDates.includes(dateStr)

          return (
            <button
              key={day}
              disabled={isDisabled}
              onClick={() => onSelect(date)}
              className="cal-day"
              data-selected={isSelected || undefined}
              data-today={isToday || undefined}
              style={{
                position: 'relative',
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                border: isSelected
                  ? '1px solid var(--led)'
                  : isToday
                    ? '1px solid rgba(123,79,255,0.5)'
                    : '1px solid transparent',
                background: isSelected
                  ? 'var(--led)'
                  : isToday
                    ? 'rgba(123,79,255,0.08)'
                    : 'transparent',
                color: isDisabled ? 'var(--fg-3)' : isSelected ? '#fff' : 'var(--fg-0)',
                fontSize: 13,
                fontFamily: 'var(--font-ui)',
                fontWeight: isToday || isSelected ? 600 : 400,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                boxShadow: isSelected ? 'var(--glow-led)' : 'none',
                opacity: isDisabled ? (isClosed ? 0.4 : isBeyondMax ? 0.2 : 0.35) : 1,
                textDecoration: isClosed ? 'line-through' : 'none',
                transition: 'all 0.12s',
              }}
            >
              {day}
              {(isBusy || isPartial) && !isSelected && (
                <div style={{
                  position: 'absolute',
                  bottom: 3,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: isPartial ? 'var(--gold)' : 'var(--led)',
                }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
