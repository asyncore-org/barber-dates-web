interface TimeSlotsProps {
  selected: string | null
  onSelect: (slot: string) => void
  taken?: string[]
}

function generateSlots() {
  const slots: string[] = []
  for (let h = 10; h <= 19; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`)
    if (h < 19) slots.push(`${h.toString().padStart(2, '0')}:30`)
  }
  return slots
}

const ALL_SLOTS = generateSlots()

export function TimeSlots({ selected, onSelect, taken = [] }: TimeSlotsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
      {ALL_SLOTS.map(slot => {
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
