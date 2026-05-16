import { useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface Reward {
  id?: string
  cost: number
  label: string
  redeemed?: boolean
  canRedeem?: boolean
}

interface LoyaltyCardProps {
  points: number
  target: number
  stamps: number
  memberCode: string
  rewards?: Reward[]
  onRedeem?: (id: string) => void
  redeemPending?: boolean
  fill?: boolean
  compact?: boolean
  createdAt?: string
  completedCycles?: number
}

// ── Tier system ───────────────────────────────────────────────────────────────

interface TierDef {
  label: string
  min: number
  primary: string
  accent: string
  c1: string   // dark shade for gradient start
  bg: string   // low-opacity bg for badge / active buttons
}

const TIERS: TierDef[] = [
  // COBRE — terracota quemado, fondo marrón oscuro
  { label: 'COBRE',    min: 0,    primary: '#a85228', accent: '#c47848', c1: '#180804', bg: 'rgba(168,82,40,0.15)'   },
  // BRONCE — bronce antiguo, cálido y oscuro
  { label: 'BRONCE',   min: 50,   primary: '#886015', accent: '#a87e28', c1: '#120c02', bg: 'rgba(136,96,21,0.15)'  },
  // PLATA — acero frío, gris azulado
  { label: 'PLATA',    min: 150,  primary: '#607890', accent: '#8898b0', c1: '#0a1420', bg: 'rgba(96,120,144,0.15)' },
  // ORO — oro cálido antiguo, sin amarillo eléctrico
  { label: 'ORO',      min: 300,  primary: '#a87e12', accent: '#c49c20', c1: '#160e00', bg: 'rgba(168,126,18,0.15)'  },
  // PLATINO — índigo profundo, sobrio y premium
  { label: 'PLATINO',  min: 500,  primary: '#505098', accent: '#7878b8', c1: '#08081c', bg: 'rgba(80,80,152,0.15)' },
  // DIAMANTE — azul océano, frío y denso
  { label: 'DIAMANTE', min: 800,  primary: '#1480a0', accent: '#3498b8', c1: '#001620', bg: 'rgba(20,128,160,0.15)'  },
  // ZAFIRO — azul zafiro real, profundo
  { label: 'ZAFIRO',   min: 1200, primary: '#1830a8', accent: '#3050c8', c1: '#020618', bg: 'rgba(24,48,168,0.15)'   },
  // LEYENDA — negro con oro antiguo, tarjeta élite
  { label: 'LEYENDA',  min: 2000, primary: '#b88c28', accent: '#d4a840', c1: '#060402', bg: 'rgba(184,140,40,0.12)'  },
]

const TIER_MAX = TIERS[TIERS.length - 1].min


function getTier(points: number): TierDef {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (points >= TIERS[i].min) return TIERS[i]
  }
  return TIERS[0]
}

function hexToRgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})`
}

// ── Animations ────────────────────────────────────────────────────────────────

const STYLES = `
@keyframes lc7-orb {
  0%,100% { opacity: 0.18; transform: scale(1); }
  50%     { opacity: 0.30; transform: scale(1.05); }
}
@keyframes lc7-pts {
  0%,100% { text-shadow: 0 0 22px var(--lc-glo1), 0 0 44px var(--lc-glo2); }
  50%     { text-shadow: 0 0 36px var(--lc-glo3), 0 0 70px var(--lc-glo4); }
}
@keyframes lc7-badge {
  0%,100% { box-shadow: 0 0 0 0   var(--lc-bds);  }
  50%     { box-shadow: 0 0 0 5px var(--lc-bds2); }
}
.lc7-orb   { animation: lc7-orb 6s ease-in-out infinite; }
.lc7-orb2  { animation: lc7-orb 8s ease-in-out infinite 2.5s; }
.lc7-pts   { animation: lc7-pts 4s ease-in-out infinite; }
.lc7-badge { animation: lc7-badge 3.5s ease-in-out infinite; }
`

// ── Component ─────────────────────────────────────────────────────────────────

export function LoyaltyCard({
  points,
  target: _target,
  stamps,
  memberCode,
  rewards = [],
  onRedeem,
  redeemPending = false,
  fill = false,
  compact = false,
  createdAt,
  completedCycles = 0,
}: LoyaltyCardProps) {
  const sm   = compact
  const tier = getTier(points)

  // Tier progression (progress bar)
  const tierPct   = Math.min(Math.round((points / TIER_MAX) * 100), 100)
  const nextTier  = TIERS.find(t => t.min > points)
  const ptsToNext = nextTier ? nextTier.min - points : 0

  // Only show marks for tiers not yet reached
  const futureTierMarks = TIERS
    .filter(t => t.min > points)
    .map(t => ({ r: t.min / TIER_MAX, label: t.label }))

  // Cycle cost multiplier
  const cycleMult = Math.pow(2, completedCycles)

  const redeemable = rewards.filter(r => !r.redeemed)
  const qrValue    = `GIO-BARBER://member/${memberCode}`

  // CSS custom properties for tier colors (used in CSS keyframe animations)
  const tierVars: Record<string, string> = {
    '--lc-edge': `linear-gradient(90deg, transparent 0%, ${tier.c1} 8%, ${tier.primary} 28%, ${tier.accent} 50%, ${tier.primary} 72%, ${tier.c1} 92%, transparent 100%)`,
    '--lc-glo1': hexToRgba(tier.primary, 0.38),
    '--lc-glo2': hexToRgba(tier.primary, 0.14),
    '--lc-glo3': hexToRgba(tier.primary, 0.72),
    '--lc-glo4': hexToRgba(tier.accent,  0.32),
    '--lc-bds':  hexToRgba(tier.primary, 0.22),
    '--lc-bds2': hexToRgba(tier.primary, 0.06),
  }

  const registeredStr = createdAt
    ? new Date(createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  useEffect(() => {
    const id = 'lc7-styles'
    if (!document.getElementById(id)) {
      const el = document.createElement('style')
      el.id = id
      el.textContent = STYLES
      document.head.appendChild(el)
    }
  }, [])

  const HP  = sm ? '1rem'    : '1.25rem'
  const VPH = sm ? '0.6rem'  : '0.875rem'

  // ── Chart: Progress bar (tier progression) ──────────────────────────────────

  const progressChart = (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.625rem', marginBottom: sm ? 12 : 18 }}>
        <div className="lc7-pts" style={{
          fontFamily: 'var(--font-display)',
          fontSize: sm ? 48 : 64,
          lineHeight: 1, letterSpacing: '-0.03em', color: '#fff',
        }}>
          {points.toLocaleString('es-ES')}
        </div>
        <div style={{
          fontFamily: 'var(--font-ui)', fontSize: sm ? 9 : 10,
          letterSpacing: '0.32em', textTransform: 'uppercase',
          color: hexToRgba(tier.accent, 0.85), paddingBottom: 4,
        }}>PUNTOS</div>
      </div>

      <div style={{ position: 'relative' }}>
        <div style={{
          height: 12, borderRadius: 6,
          background: 'rgba(255,255,255,0.07)',
          overflow: 'hidden', position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0,
            width: `${tierPct}%`, borderRadius: 6,
            background: `linear-gradient(90deg, ${tier.c1} 0%, ${tier.primary} 55%, ${tier.accent} 100%)`,
            transition: 'width 1.4s cubic-bezier(0.4,0,0.2,1) 0.22s',
            boxShadow: `0 0 18px ${hexToRgba(tier.primary, 0.55)}`,
          }} />
        </div>
        {futureTierMarks.map(m => (
          <div key={m.label} style={{
            position: 'absolute', top: -5, left: `${m.r * 100}%`,
            width: 1.5, height: 22, borderRadius: 1,
            background: 'rgba(255,255,255,0.18)',
            transform: 'translateX(-50%)',
          }} />
        ))}
        {tierPct > 2 && tierPct < 100 && (
          <div style={{
            position: 'absolute', top: 6, left: `${tierPct}%`,
            width: 18, height: 18, borderRadius: '50%', background: '#fff',
            transform: 'translate(-50%, -50%)',
            boxShadow: `0 0 0 4px ${hexToRgba(tier.primary, 0.3)}, 0 0 22px ${tier.primary}`, zIndex: 2,
          }} />
        )}
      </div>

      <div style={{ position: 'relative', height: 20, marginTop: 8 }}>
        {futureTierMarks.map((m, i) => {
          const isLast  = i === futureTierMarks.length - 1
          const isFirst = i === 0
          return (
            <span key={m.label} style={{
              position: 'absolute',
              left:  isLast ? undefined : (isFirst ? `${m.r * 100}%` : `${m.r * 100}%`),
              right: isLast ? 0 : undefined,
              transform: !isLast ? 'translateX(-50%)' : undefined,
              fontFamily: 'var(--font-ui)', fontSize: 7.5, letterSpacing: '0.08em',
              color: 'rgba(255,255,255,0.45)',
              whiteSpace: 'nowrap',
            }}>{m.label}</span>
          )
        })}
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: sm ? 10 : 14, fontFamily: 'var(--font-ui)', fontSize: sm ? 10 : 11,
        borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: sm ? 8 : 10,
      }}>
        <span style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em' }}>
          {stamps} {stamps === 1 ? 'visita' : 'visitas'}
        </span>
        <span style={{
          color: ptsToNext > 0 ? hexToRgba(tier.accent, 0.75) : tier.accent,
          fontWeight: 500, letterSpacing: '0.02em',
        }}>
          {ptsToNext > 0
            ? `${ptsToNext.toLocaleString('es-ES')} pts → ${nextTier?.label}`
            : `✓ Nivel máximo`}
        </span>
      </div>
    </div>
  )

  const fixed: React.CSSProperties = fill ? { flexShrink: 0 } : {}

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      position: 'relative',
      borderRadius: 22,
      overflow: 'hidden',
      background: `radial-gradient(ellipse 75% 55% at 88% 12%, ${hexToRgba(tier.primary, 0.18)} 0%, transparent 70%), ${tier.c1}`,
      border: `1px solid ${hexToRgba(tier.primary, 0.48)}`,
      boxShadow:
        `inset 0 1px 0 ${hexToRgba(tier.accent, 0.22)}, ` +
        `inset 0 0 0 1px ${hexToRgba(tier.primary, 0.14)}, ` +
        '0 20px 56px rgba(0,0,0,0.9)',
      width: '100%',
      ...(fill ? {
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      } : {}),
      ...tierVars,
    } as React.CSSProperties}>

      {/* Background orbs */}
      <div className="lc7-orb" style={{
        position: 'absolute', top: -80, right: -80,
        width: 280, height: 280, borderRadius: '50%',
        background: `radial-gradient(circle, ${hexToRgba(tier.primary, 0.16)} 0%, transparent 70%)`,
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div className="lc7-orb2" style={{
        position: 'absolute', bottom: -60, left: -60,
        width: 240, height: 240, borderRadius: '50%',
        background: `radial-gradient(circle, ${hexToRgba(tier.accent, 0.1)} 0%, transparent 70%)`,
        pointerEvents: 'none', zIndex: 0,
      }} />


      {/* ── Top bar ── */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${tier.c1} 0%, ${tier.primary} 30%, ${tier.accent} 55%, ${tier.primary} 80%, ${tier.c1} 100%)`, zIndex: 2, ...fixed }} />

      {/* ── Header ── */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        padding: `calc(${VPH} + 0.5rem) ${HP} ${VPH}`,
        ...fixed,
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: sm ? 16 : 19,
            letterSpacing: '0.08em', color: 'rgba(255,255,255,0.97)', lineHeight: 1,
          }}>GIO BARBER</div>
          <div style={{
            fontFamily: 'var(--font-ui)', fontSize: sm ? 8 : 8.5,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            color: hexToRgba(tier.accent, 0.72), marginTop: sm ? 4 : 6,
          }}>LOYALTY CLUB</div>
        </div>

        <div className="lc7-badge" style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: sm ? '4px 10px' : '5px 13px', borderRadius: 20,
          background: tier.bg, border: `1px solid ${hexToRgba(tier.primary, 0.35)}`,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: tier.primary, boxShadow: `0 0 8px ${hexToRgba(tier.primary, 0.95)}`,
          }} />
          <span style={{
            fontFamily: 'var(--font-ui)',
            fontSize: sm ? 10 : 11, fontWeight: 700,
            letterSpacing: '0.18em', color: tier.accent,
          }}>{tier.label}</span>
        </div>
      </div>

      {/* ── Chart area ── */}
      <div style={{
        position: 'relative', zIndex: 2,
        paddingLeft: HP, paddingRight: HP,
        paddingTop: sm ? '0.5rem' : '0.75rem',
        paddingBottom: sm ? '1rem' : '1.25rem',
      }}>
        {progressChart}
      </div>

      {/* ── Rewards ── */}
      {redeemable.length > 0 && (
        <>
          <div style={{
            position: 'relative', zIndex: 2, height: 1,
            marginLeft: HP, marginRight: HP,
            marginTop: sm ? '0.5rem' : '0.625rem',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.09), transparent)',
            ...fixed,
          }} />
          <div style={{
            position: 'relative', zIndex: 2,
            paddingLeft: HP, paddingRight: HP,
            paddingTop: sm ? '0.4rem' : '0.5rem',
            paddingBottom: sm ? '0.2rem' : '0.3rem',
            ...fixed,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: 'var(--font-ui)', fontSize: 7.5,
              letterSpacing: '0.28em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.42)', marginBottom: sm ? 5 : 7,
            }}>
              Recompensas
              {completedCycles > 0 && (
                <span style={{
                  fontFamily: 'var(--font-mono, monospace)', fontSize: 7,
                  letterSpacing: '0.08em',
                  background: tier.bg, border: `1px solid ${hexToRgba(tier.primary, 0.35)}`,
                  color: tier.accent, borderRadius: 4, padding: '1px 5px',
                }}>×{cycleMult} ciclo {completedCycles}</span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: sm ? 4 : 5 }}>
              {redeemable.map((r, i) => {
                const adjustedCost = r.cost * cycleMult
                const can = points >= adjustedCost
                return (
                  <div key={r.id ?? i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: sm ? '0.3rem 0.55rem' : '0.4rem 0.65rem',
                    borderRadius: 9,
                    background: can ? tier.bg : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${can ? hexToRgba(tier.primary, 0.22) : 'rgba(255,255,255,0.07)'}`,
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: can ? tier.primary : 'rgba(255,255,255,0.15)',
                      boxShadow: can ? `0 0 8px ${hexToRgba(tier.primary, 0.7)}` : 'none',
                    }} />
                    <span style={{
                      flex: 1, fontFamily: 'var(--font-ui)',
                      fontSize: sm ? 11 : 12, fontWeight: can ? 500 : 400,
                      color: can ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.4)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{r.label}</span>
                    <span style={{
                      fontFamily: 'var(--font-mono, monospace)', fontSize: sm ? 9 : 10, flexShrink: 0,
                      color: can ? tier.accent : 'rgba(255,255,255,0.3)',
                    }}>{adjustedCost.toLocaleString('es-ES')} pts</span>
                    {onRedeem && r.id && (
                      <button
                        disabled={!can || redeemPending}
                        onClick={() => onRedeem(r.id!)}
                        style={{
                          flexShrink: 0, padding: sm ? '2px 8px' : '3px 10px', borderRadius: 6,
                          border: `1px solid ${can ? hexToRgba(tier.primary, 0.45) : 'rgba(255,255,255,0.08)'}`,
                          background: can ? tier.bg : 'transparent',
                          color: can ? tier.accent : 'rgba(255,255,255,0.28)',
                          fontFamily: 'var(--font-ui)', fontSize: 8, fontWeight: 700,
                          letterSpacing: '0.1em', cursor: can ? 'pointer' : 'default',
                          opacity: redeemPending ? 0.6 : 1,
                        }}
                      >CANJEAR</button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Spacer — empuja footer al fondo cuando fill=true */}
      {fill && <div style={{ flex: 1 }} />}

      {/* ── Footer divider ── */}
      <div style={{
        position: 'relative', zIndex: 2,
        marginLeft: HP, marginRight: HP,
        marginTop: fill ? 0 : sm ? '0.5rem' : '0.625rem',
        borderTop: '1px dashed rgba(255,255,255,0.09)',
        ...fixed,
      }} />

      {/* ── Footer ── */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', alignItems: 'center', gap: '1rem',
        padding: `${VPH} ${HP} calc(${VPH} + 0.5rem)`,
        ...fixed,
      }}>
        <div style={{
          flexShrink: 0, padding: sm ? 4 : 5, borderRadius: 8, background: '#fff',
        }}>
          <QRCodeSVG value={qrValue} size={sm ? 46 : 58} level="M" marginSize={0} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: sm ? 11 : 13, fontWeight: 700,
            letterSpacing: '0.14em', color: tier.accent,
            marginBottom: 3,
          }}>{memberCode}</div>
          <div style={{
            fontFamily: 'var(--font-ui)', fontSize: 7.5,
            color: 'rgba(255,255,255,0.38)', letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>Código de miembro</div>
          {registeredStr && (
            <div style={{
              fontFamily: 'var(--font-ui)', fontSize: 7.5,
              color: hexToRgba(tier.accent, 0.45), marginTop: 4,
              letterSpacing: '0.04em',
            }}>Desde {registeredStr}</div>
          )}
        </div>

        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{
            fontFamily: 'var(--font-ui)', fontSize: 7.5,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.35)', marginBottom: 4,
          }}>Nivel</div>
          <div style={{
            fontFamily: 'var(--font-ui)', fontSize: sm ? 11 : 13, fontWeight: 700,
            letterSpacing: '0.18em', color: tier.accent,
          }}>{tier.label}</div>
          {ptsToNext > 0 && (
            <div style={{
              fontFamily: 'var(--font-ui)', fontSize: 7,
              color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', marginTop: 3,
            }}>{ptsToNext.toLocaleString('es-ES')} pts</div>
          )}
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${tier.c1} 0%, ${tier.primary} 30%, ${tier.accent} 55%, ${tier.primary} 80%, ${tier.c1} 100%)`, zIndex: 2, ...fixed }} />
    </div>
  )
}
