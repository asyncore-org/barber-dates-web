import type { MockService } from '@/lib/mock-data'

interface ServiceCardProps {
  service: MockService
  selected: boolean
  onClick: () => void
}

export function ServiceCard({ service, selected, onClick }: ServiceCardProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '0.875rem 1rem',
        minHeight: 44,
        borderRadius: 8,
        border: selected ? '1px solid var(--led-soft)' : '1px solid var(--line)',
        background: selected ? 'rgba(123,79,255,0.08)' : 'var(--bg-3)',
        cursor: 'pointer',
        boxShadow: selected ? 'var(--glow-led)' : 'none',
        transition: 'all 0.15s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
      }}
    >
      <div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 16,
          letterSpacing: '0.04em',
          color: selected ? 'var(--fg-0)' : 'var(--fg-1)',
        }}>
          {service.name}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: 2 }}>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--fg-2)' }}>
            {service.duration} min
          </span>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--gold)' }}>
            +{service.points} pts
          </span>
        </div>
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 20,
        color: selected ? 'var(--fg-0)' : 'var(--fg-1)',
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
      }}>
        {service.price}€
      </div>
    </button>
  )
}
