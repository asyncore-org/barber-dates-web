interface Props {
  points: number
  target: number
  accentVar?: string
}

export function LoyaltyProgressBar({ points, target, accentVar = '--led' }: Props) {
  const pct = Math.min(100, (points / Math.max(1, target)) * 100)
  const accent = `var(${accentVar})`

  return (
    <div style={{ position: 'relative', marginTop: 3 }}>
      {/* Floating points label */}
      <div style={{
        position: 'absolute',
        right: 0,
        top: -12,
        fontSize: 8,
        fontFamily: 'var(--font-mono, monospace)',
        color: accent,
        fontWeight: 700,
        lineHeight: 1,
        pointerEvents: 'none',
        letterSpacing: '0.04em',
      }}>
        {points}/{target}
      </div>

      {/* Track */}
      <div style={{
        height: 4,
        borderRadius: 2,
        background: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}>
        {/* Fill */}
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: 2,
          background: `linear-gradient(90deg, color-mix(in srgb, ${accent} 60%, transparent), ${accent})`,
          boxShadow: `0 0 6px ${accent}`,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )
}
