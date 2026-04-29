import { useShopContext } from '@/context/ShopContext'

interface LogoProps {
  size?: number
}

export function Logo({ size = 36 }: LogoProps) {
  const { name } = useShopContext()
  const parts = name.toUpperCase().trim().split(/\s+/)
  const line1 = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0]
  const line2 = parts.length > 1 ? `— ${parts[parts.length - 1]} —` : '— SHOP —'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: size,
        height: size,
        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
        background: 'linear-gradient(145deg, var(--bg-4), var(--bg-2))',
        border: '1px solid var(--line-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0,
      }}>
        <svg
          width={size * 0.55}
          height={size * 0.55}
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--gold)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-label={name}
        >
          <circle cx="6" cy="6" r="3"/>
          <circle cx="6" cy="18" r="3"/>
          <line x1="20" y1="4" x2="8.12" y2="15.88"/>
          <line x1="14.47" y1="14.48" x2="20" y2="20"/>
          <line x1="8.12" y1="8.12" x2="12" y2="12"/>
        </svg>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, whiteSpace: 'nowrap' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: '.14em', color: 'var(--fg-0)' }}>
          {line1}
        </span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '.32em', color: 'var(--fg-2)', marginTop: 2 }}>
          {line2}
        </span>
      </div>
    </div>
  )
}
