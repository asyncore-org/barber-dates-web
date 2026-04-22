interface LoyaltyCardProps {
  points: number
  target: number
  stamps: number
  memberCode: string
}

export function LoyaltyCard({ points, target, stamps, memberCode }: LoyaltyCardProps) {
  const pct = Math.min((points / target) * 100, 100)

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0d0d10 0%, #1a1a20 50%, #0d0d10 100%)',
      border: '1px solid rgba(201,162,74,0.3)',
      borderRadius: 12,
      padding: '1.25rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(circle at 80% 20%, rgba(201,162,74,0.06) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.15em', color: 'var(--gold)', marginBottom: 2 }}>
            GIO BLACK CARD
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '0.04em', color: '#fff' }}>
            {points.toLocaleString()}
            <span style={{ fontSize: 14, color: 'var(--gold)', marginLeft: 4 }}>pts</span>
          </div>
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 2,
        }}>
          <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10, color: 'rgba(201,162,74,0.5)' }}>MIEMBRO</div>
          <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, color: 'var(--gold)', letterSpacing: '0.1em' }}>{memberCode}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: '0.875rem' }}>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} style={{
            aspectRatio: '1',
            clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
            background: i < stamps
              ? 'linear-gradient(135deg, var(--gold), var(--brick-warm))'
              : 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
          }}>
            {i < stamps ? '✓' : ''}
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: 'var(--font-ui)', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
          <span>{points} pts</span>
          <span>{target} pts</span>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: 'linear-gradient(90deg, var(--brick), var(--gold))',
            borderRadius: 2,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>
    </div>
  )
}
