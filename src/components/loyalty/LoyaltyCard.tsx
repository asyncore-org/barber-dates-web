interface Reward {
  cost: number
  label: string
}

interface LoyaltyCardProps {
  points: number
  target: number
  stamps: number
  memberCode: string
  rewards?: Reward[]
}

export function LoyaltyCard({ points, target, memberCode, rewards = [] }: LoyaltyCardProps) {
  const pct = Math.min((points / target) * 100, 100)

  const milestones = rewards
    .filter(r => r.cost <= target)
    .sort((a, b) => a.cost - b.cost)
    .map(r => ({
      pts: r.cost,
      label: r.label,
      pct: Math.min((r.cost / target) * 100, 100),
      reached: points >= r.cost,
    }))

  const nextReward = milestones.find(m => !m.reached)
  const ptsToNext = nextReward ? nextReward.pts - points : 0

  return (
    <div
      className="p-4 md:p-5"
      style={{
        background: 'linear-gradient(135deg, #0d0d10 0%, #1a1a20 50%, #0d0d10 100%)',
        border: '1px solid color-mix(in srgb, var(--gold) 30%, transparent)',
        borderRadius: 12,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(circle at 80% 20%, color-mix(in srgb, var(--gold) 6%, transparent) 0%, transparent 60%)',
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
          <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10, color: 'color-mix(in srgb, var(--gold) 50%, transparent)' }}>MIEMBRO</div>
          <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, color: 'var(--gold)', letterSpacing: '0.1em' }}>{memberCode}</div>
        </div>
      </div>

      {/* Progress section */}
      <div>
        {/* Milestone labels + ticks */}
        {milestones.length > 0 && (
          <div style={{ position: 'relative', height: 36, marginBottom: 2 }}>
            {milestones.map(m => (
              <div
                key={m.pts}
                style={{
                  position: 'absolute',
                  left: m.pct >= 98 ? 'calc(100% - 1px)' : `${m.pct}%`,
                  transform: m.pct >= 98 ? 'translateX(-100%)' : 'translateX(-50%)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                }}
              >
                <span style={{
                  fontFamily: 'var(--font-mono, monospace)', fontSize: 8,
                  color: m.reached ? 'var(--gold)' : 'rgba(255,255,255,0.25)',
                  transition: 'color 0.4s ease',
                  whiteSpace: 'nowrap',
                  maxWidth: 60,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textAlign: 'center',
                }}>
                  {m.label}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono, monospace)', fontSize: 8,
                  color: m.reached ? 'color-mix(in srgb, var(--gold) 70%, transparent)' : 'rgba(255,255,255,0.2)',
                }}>
                  {m.pts}
                </span>
                <div style={{
                  width: 1, height: 6,
                  background: m.reached ? 'color-mix(in srgb, var(--gold) 70%, transparent)' : 'rgba(255,255,255,0.12)',
                  transition: 'background 0.4s ease',
                }} />
              </div>
            ))}
          </div>
        )}

        {/* Bar track */}
        <div style={{ position: 'relative', height: 12, background: 'rgba(255,255,255,0.07)', borderRadius: 8 }}>
          {/* Fill */}
          <div
            style={{
              position: 'absolute', top: 0, left: 0, bottom: 0,
              width: `${pct}%`, maxWidth: '100%',
              background: 'linear-gradient(90deg, var(--brick), var(--gold))',
              borderRadius: 8,
              transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)',
              boxShadow: pct > 0 ? '0 0 12px color-mix(in srgb, var(--gold) 55%, transparent), 0 0 4px color-mix(in srgb, var(--gold) 30%, transparent)' : 'none',
            }}
          />

          {/* Milestone pulse rings */}
          {milestones.filter(m => m.reached && m.pct < 98).map(m => (
            <div
              key={m.pts}
              style={{
                position: 'absolute',
                left: `${m.pct}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--gold)',
                boxShadow: '0 0 6px color-mix(in srgb, var(--gold) 90%, transparent)',
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
                boxShadow: '0 0 8px var(--gold), 0 0 20px color-mix(in srgb, var(--gold) 50%, transparent)',
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
          background: 'color-mix(in srgb, var(--gold) 7%, transparent)',
          border: '1px solid color-mix(in srgb, var(--gold) 18%, transparent)',
          borderRadius: 8,
        }}>
          <span style={{ fontSize: 13 }}>★</span>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--gold)', flex: 1 }}>
            {ptsToNext > 0 && nextReward
              ? <><strong>{ptsToNext} pts</strong> para <strong>{nextReward.label}</strong></>
              : <strong>¡Meta alcanzada! Canjea tu recompensa</strong>
            }
          </span>
        </div>
      </div>
    </div>
  )
}
