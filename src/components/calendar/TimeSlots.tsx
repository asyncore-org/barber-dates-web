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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
      {ALL_SLOTS.map(slot => {
        const isTaken = taken.includes(slot)
        const isSelected = selected === slot

        return (
          <button
            key={slot}
            disabled={isTaken}
            onClick={() => onSelect(slot)}
            style={{
              padding: '0.4rem 0',
              borderRadius: 6,
              border: isSelected ? '1px solid var(--fg-0)' : '1px solid var(--line)',
              background: isSelected ? '#fff' : isTaken ? 'transparent' : 'var(--bg-3)',
              color: isTaken ? 'var(--fg-3)' : isSelected ? '#0a0a0b' : 'var(--fg-1)',
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
