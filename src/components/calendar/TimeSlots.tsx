interface TimeSlotsProps {
  selected: string | null
  onSelect: (slot: string) => void
  taken?: string[]
  fromTime?: string
  toTime?: string
}

export function generateScheduleSlots(from = '10:00', to = '19:00'): string[] {
  const [fromH, fromM] = from.split(':').map(Number)
  const [toH, toM] = to.split(':').map(Number)
  const toMinutes = toH * 60 + toM
  const slots: string[] = []
  let minutes = fromH * 60 + fromM
  while (minutes < toMinutes) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    minutes += 30
  }
  return slots
}

export function TimeSlots({ selected, onSelect, taken = [], fromTime, toTime }: TimeSlotsProps) {
  const slots = generateScheduleSlots(fromTime, toTime)
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
      {slots.map(slot => {
        const isTaken = taken.includes(slot)
        const isSelected = selected === slot

        return (
          <button
            key={slot}
            disabled={isTaken}
            onClick={() => onSelect(slot)}
            style={{
              padding: '0.75rem 0',
              minHeight: 44,
              borderRadius: 6,
              border: isSelected ? '1px solid var(--led-soft)' : '1px solid var(--line)',
              background: isSelected ? 'rgba(123,79,255,0.1)' : isTaken ? 'transparent' : 'var(--bg-3)',
              color: isTaken ? 'var(--fg-3)' : isSelected ? 'var(--fg-0)' : 'var(--fg-1)',
              fontSize: 12,
              fontFamily: 'var(--font-mono, monospace)',
              cursor: isTaken ? 'default' : 'pointer',
              textDecoration: isTaken ? 'line-through' : 'none',
              opacity: isTaken ? 0.5 : 1,
              transition: 'all 0.12s',
            }}
          >
            {slot}
          </button>
        )
      })}
    </div>
  )
}
