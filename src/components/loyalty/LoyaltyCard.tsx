interface LoyaltyCardProps {
  points: number
  target: number
  stamps: number
  memberCode: string
}

const MILESTONES = [25, 50, 75, 100]

export function LoyaltyCard({ points, target, memberCode }: LoyaltyCardProps) {
  const pct = Math.min((points / target) * 100, 100)
  const ptsToNext = Math.max(target - points, 0)

  const milestones = MILESTONES.map(p => ({
    pct: p,
    pts: Math.round((p / 100) * target),
    reached: pct >= p,
  }))

  return (
    <div
      className="p-4 md:p-5"
      style={{
        background: 'linear-gradient(135deg, #0d0d10 0%, #1a1a20 50%, #0d0d10 100%)',
        border: '1px solid rgba(201,162,74,0.3)',
        borderRadius: 12,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(circle at 80% 20%, rgba(201,162,74,0.06) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.15em', color: 'var(--gold)', marginBottom: 2 }}>
            GIO BLACK CARD
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '0.04em', color: '#fff' }}>
            {points.toLocaleString()}
            <span style={{ fontSize: 14, color: 'var(--gold)', marginLeft: 4 }}>pts</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10, color: 'rgba(201,162,74,0.5)' }}>MIEMBRO</div>
          <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, color: 'var(--gold)', letterSpacing: '0.1em' }}>{memberCode}</div>
        </div>
      </div>

      {/* Epic progress section */}
      <div>
        {/* Milestone labels + ticks */}
        <div style={{ position: 'relative', height: 28, marginBottom: 2 }}>
          {milestones.map(m => (
            <div
              key={m.pct}
              style={{
                position: 'absolute',
                left: m.pct === 100 ? 'calc(100% - 1px)' : `${m.pct}%`,
                transform: m.pct === 100 ? 'translateX(-100%)' : 'translateX(-50%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}
            >
              <span style={{
                fontFamily: 'var(--font-mono, monospace)', fontSize: 9,
                color: m.reached ? 'var(--gold)' : 'rgba(255,255,255,0.25)',
                transition: 'color 0.4s ease',
                whiteSpace: 'nowrap',
              }}>
                {m.pts}
              </span>
              <div style={{
                width: 1, height: 8,
                background: m.reached ? 'rgba(201,162,74,0.7)' : 'rgba(255,255,255,0.12)',
                transition: 'background 0.4s ease',
              }} />
            </div>
          ))}
        </div>

        {/* Bar track */}
        <div style={{ position: 'relative', height: 12, background: 'rgba(255,255,255,0.07)', borderRadius: 8 }}>
          {/* Fill */}
          <div
            style={{
              position: 'absolute', top: 0, left: 0, bottom: 0,
              width: `${pct}%`, maxWidth: '100%',
              background: 'linear-gradient(90deg, #8b3a1f, var(--gold))',
              borderRadius: 8,
              transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)',
              boxShadow: pct > 0 ? '0 0 12px rgba(201,162,74,0.55), 0 0 4px rgba(201,162,74,0.3)' : 'none',
            }}
          />

          {/* Milestone pulse rings */}
          {milestones.filter(m => m.reached && m.pct < 100).map(m => (
            <div
              key={m.pct}
              style={{
                position: 'absolute',
                left: `${m.pct}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--gold)',
                boxShadow: '0 0 6px rgba(201,162,74,0.9)',
                zIndex: 1,
              }}
            />
          ))}

          {/* Glowing tip dot */}
          {pct > 1 && pct < 99.5 && (
            <div
              style={{
                position: 'absolute',
                left: `${pct}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 16, height: 16, borderRadius: '50%',
                background: 'radial-gradient(circle, #fff 30%, var(--gold) 100%)',
                boxShadow: '0 0 8px rgba(201,162,74,1), 0 0 20px rgba(201,162,74,0.5)',
                zIndex: 2,
                transition: 'left 0.8s cubic-bezier(0.22,1,0.36,1)',
              }}
            />
          )}
        </div>

        {/* Points label */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>0</span>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{target} pts</span>
        </div>

        {/* Next reward text */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginTop: '0.875rem',
          padding: '0.5rem 0.75rem',
          background: 'rgba(201,162,74,0.07)',
          border: '1px solid rgba(201,162,74,0.18)',
          borderRadius: 8,
        }}>
          <span style={{ fontSize: 13 }}>★</span>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--gold)', flex: 1 }}>
            {ptsToNext > 0
              ? <><strong>{ptsToNext} pts</strong> para tu próxima recompensa</>
              : <strong>¡Meta alcanzada! Canjea tu recompensa</strong>
            }
          </span>
        </div>
      </div>
    </div>
  )
}
