import type { Service } from '@/domain/service'

interface ServiceCardProps {
  service: Service
  selected: boolean
  onClick: () => void
  disabled?: boolean
}

export function ServiceCard({ service, selected, onClick, disabled = false }: ServiceCardProps) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '0.875rem 1rem',
        minHeight: 44,
        borderRadius: 8,
        border: selected ? '1px solid var(--led-soft)' : '1px solid var(--line)',
        background: disabled ? 'var(--bg-2)' : selected ? 'rgba(123,79,255,0.08)' : 'var(--bg-3)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: 'none',
        transition: 'all 0.15s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        opacity: disabled ? 0.4 : 1,
        position: 'relative',
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
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: 2, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--fg-2)' }}>
            {service.durationMinutes} min
          </span>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--gold)' }}>
            +{service.loyaltyPoints} pts
          </span>
          {disabled && (
            <span style={{ fontSize: 10, fontFamily: 'var(--font-ui)', color: 'var(--fg-3)', letterSpacing: '0.05em' }}>
              NO DISPONIBLE
            </span>
          )}
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
