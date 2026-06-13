import { Icon } from '@/components/ui'

interface MonthCalendarProps {
  selected: Date | null
  onSelect: (date: Date) => void
  month: number
  year: number
  onMonthChange: (month: number, year: number) => void
  busyDays?: number[]
  minDate?: Date
  maxDate?: Date
  /** Day-of-week numbers (0=Mon … 6=Sun, ISO) that are fully closed. Rendered as disabled + line-through. */
  closedDayOfWeeks?: number[]
  /** 'YYYY-MM-DD' dates with a partial schedule block. Rendered with an orange indicator dot. */
  partialDates?: string[]
  /** Hide the internal month navigation row (use when nav is rendered externally). */
  hideNav?: boolean
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

export function MonthCalendar({ selected, onSelect, month, year, onMonthChange, busyDays = [], minDate, maxDate, closedDayOfWeeks = [], partialDates = [], hideNav = false }: MonthCalendarProps) {
  const today = new Date()
  const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const minNorm = minDate ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()) : null
  const maxNorm = maxDate ? new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()) : null

  const days = getMonthDays(year, month)

  const isAtMinMonth = minNorm
    ? (year < minNorm.getFullYear() || (year === minNorm.getFullYear() && month <= minNorm.getMonth()))
    : (month === today.getMonth() && year === today.getFullYear())
  const isAtCurrentMonth = month === today.getMonth() && year === today.getFullYear()
  const isNextMonthBeyondMax = maxNorm ? new Date(year, month + 1, 1) > maxNorm : false

  const prev = () => {
    if (isAtMinMonth) return
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
      {!hideNav && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <button onClick={prev} disabled={isAtMinMonth} className="cal-nav-btn">
              <Icon name="chevronL" size={14} />
            </button>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--fg-0)', letterSpacing: '0.08em', minWidth: 130, textAlign: 'center', textTransform: 'uppercase' }}>
              {MONTH_NAMES[month]} {year}
            </span>
            <button onClick={next} disabled={isNextMonthBeyondMax} className="cal-nav-btn">
              <Icon name="chevronR" size={14} />
            </button>
          </div>
          <button onClick={goToday} disabled={isAtCurrentMonth && !minNorm} className="cal-nav-btn"
            style={{ width: 'auto', padding: '0 0.625rem', fontSize: 11, fontFamily: 'var(--font-ui)' }}>
            Hoy
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 6 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--fg-4)', fontWeight: 700, fontFamily: 'var(--font-ui)', padding: '0.25rem 0', letterSpacing: '0.1em', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {days.map(({ day, current }, i) => {
          if (!current) return <div key={`e${i}`} />
          const date = new Date(year, month, day)
          const isPast = minNorm ? date < minNorm : date < todayNorm
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
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isSelected
                  ? 'var(--gold)'
                  : isToday
                    ? 'rgba(201,162,74,0.08)'
                    : 'transparent',
                borderRadius: 6,
                border: isToday && !isSelected ? '1px solid rgba(201,162,74,0.3)' : 'none',
                color: isDisabled ? 'var(--fg-4)' : isSelected ? '#000' : 'var(--fg-0)',
                fontSize: 13,
                fontFamily: 'var(--font-ui)',
                fontWeight: isToday || isSelected ? 700 : 400,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                boxShadow: isSelected ? '0 2px 8px rgba(201,162,74,0.25)' : 'none',
                opacity: isDisabled ? (isClosed ? 0.25 : isBeyondMax ? 0.15 : 0.25) : 1,
                textDecoration: isClosed ? 'line-through' : 'none',
                transition: 'background 0.12s, color 0.12s',
              }}
            >
              {day}
              {(isBusy || isPartial) && !isSelected && (
                <div style={{
                  position: 'absolute',
                  bottom: 3,
                  width: 4,
                  height: 4,
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
