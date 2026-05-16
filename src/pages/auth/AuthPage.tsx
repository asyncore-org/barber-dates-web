import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '@/hooks'
import { useShopContext } from '@/context/ShopContext'
import { Logo } from '@/components/layout'

// ── Inline SVG icons ──────────────────────────────────────────────────────────

function IconMapPin({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function IconClock({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function IconPhone({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l.9-.9a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

function AppleLogo({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

// ── Shared data ───────────────────────────────────────────────────────────────

const shopInfoItems = [
  { Icon: IconMapPin, text: 'Calle Gran Via 12, Barcelona', href: 'https://www.google.com/maps/search/?api=1&query=Calle+Gran+Via+12+Barcelona' },
  { Icon: IconClock,  text: 'Lun – Sáb · 09:00 – 20:00',  href: undefined },
  { Icon: IconPhone,  text: '+34 931 234 567',              href: 'tel:+34931234567' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function AuthPage() {
  const { name: shopName } = useShopContext()
  const { user, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    navigate(user.role === 'admin' ? '/admin/dashboard' : '/calendar', { replace: true })
  }, [user, navigate])

  const handleGoogle = async () => {
    setError(null)
    setLoading('google')
    try {
      await signInWithGoogle()
    } catch {
      setError('No se pudo conectar con Google. Inténtalo de nuevo.')
      setLoading(null)
    }
  }

  const handleApple = () => {
    setError(null)
    setLoading('apple')
    setTimeout(() => {
      setError('Inicio con Apple no disponible aún.')
      setLoading(null)
    }, 800)
  }

  const errorBlock = error ? (
    <div style={{
      marginTop: '0.875rem',
      padding: '0.75rem 1rem',
      borderRadius: 10,
      background: 'rgba(192,64,64,0.15)',
      border: '1px solid rgba(192,64,64,0.35)',
      color: '#fca5a5',
      fontFamily: 'var(--font-ui)',
      fontSize: 13,
      textAlign: 'center',
    }}>
      {error}
    </div>
  ) : null

  return (
    <>
      <Helmet>
        <title>Acceder — {shopName}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* ═══════════════════════════════════════
          MOBILE — full-screen image overlay
      ═══════════════════════════════════════ */}
      <div
        className="md:hidden flex flex-col"
        style={{ position: 'relative', minHeight: '100dvh', overflow: 'hidden' }}
      >
        {/* Background photo */}
        <img
          src="/assets/shop-interior-1.png"
          alt={`${shopName} interior`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
        />
        {/* Gradient overlay — lighter top, heavy bottom */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(10,10,11,0.38) 0%, rgba(10,10,11,0.65) 38%, rgba(10,10,11,0.93) 100%)',
        }} />

        {/* Content column */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100dvh',
          padding: '1.25rem',
          paddingTop: 'max(1.25rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        }}>
          {/* Logo */}
          <Logo size={32} />

          {/* Flexible spacer — pushes everything below to the bottom third */}
          <div style={{ flex: 1 }} />

          {/* Hero heading */}
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(50px, 15.5vw, 70px)',
            lineHeight: 0.9,
            color: '#fff',
            textTransform: 'uppercase',
            marginBottom: '0.875rem',
          }}>
            Reserva tu<br />
            <span style={{ color: 'var(--gold)' }}>Asiento</span><br />
            del barbero
          </div>

          {/* Gold separator */}
          <div style={{ width: 48, height: 2, background: 'var(--gold)', marginBottom: '0.875rem' }} />

          {/* Subtitle */}
          <p style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 14,
            lineHeight: 1.6,
            color: 'rgba(245,242,236,0.7)',
            marginBottom: '1.25rem',
          }}>
            La experiencia de barbería premium.<br />
            Reserva online y acumula puntos con cada visita.
          </p>

          {/* Info card */}
          <div style={{
            background: 'rgba(10,10,12,0.52)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14,
            padding: '0.875rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.625rem',
            marginBottom: '1.5rem',
          }}>
            {shopInfoItems.map(({ Icon, text, href }) => {
              const inner = (
                <>
                  <Icon size={15} color="var(--gold)" />
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'rgba(245,242,236,0.82)' }}>
                    {text}
                  </span>
                </>
              )
              return href ? (
                <a key={text} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
                  {inner}
                </a>
              ) : (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  {inner}
                </div>
              )
            })}
          </div>

          {/* Auth buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Google */}
            <button
              onClick={handleGoogle}
              disabled={loading !== null}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.625rem',
                width: '100%',
                minHeight: 54,
                borderRadius: 27,
                border: 'none',
                background: loading === 'google' ? 'rgba(230,222,208,0.9)' : '#EAE3D5',
                color: '#111111',
                fontFamily: 'var(--font-ui)',
                fontSize: 15,
                fontWeight: 600,
                cursor: loading !== null ? 'wait' : 'pointer',
                opacity: loading !== null && loading !== 'google' ? 0.5 : 1,
                transition: 'opacity 0.15s, background 0.15s',
              }}
            >
              {loading === 'google' ? (
                <span style={{ opacity: 0.6 }}>Conectando…</span>
              ) : (
                <>
                  <GoogleLogo size={20} />
                  Continuar con Google
                </>
              )}
            </button>

            {/* Apple */}
            <button
              onClick={handleApple}
              disabled={loading !== null}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.625rem',
                width: '100%',
                minHeight: 54,
                borderRadius: 27,
                border: '1px solid rgba(255,255,255,0.12)',
                background: loading === 'apple' ? 'rgba(28,28,34,0.92)' : 'rgba(18,18,22,0.85)',
                color: '#fff',
                fontFamily: 'var(--font-ui)',
                fontSize: 15,
                fontWeight: 600,
                cursor: loading !== null ? 'wait' : 'pointer',
                opacity: loading !== null && loading !== 'apple' ? 0.5 : 1,
                transition: 'opacity 0.15s, background 0.15s',
              }}
            >
              {loading === 'apple' ? (
                <span style={{ opacity: 0.6 }}>Conectando…</span>
              ) : (
                <>
                  <AppleLogo size={20} color="#fff" />
                  Continuar con Apple
                </>
              )}
            </button>
          </div>

          {errorBlock}

          {/* Legal */}
          <p style={{
            marginTop: '1.25rem',
            textAlign: 'center',
            fontSize: 11,
            fontFamily: 'var(--font-ui)',
            color: 'rgba(245,242,236,0.38)',
            lineHeight: 1.7,
          }}>
            Al continuar aceptas nuestros{' '}
            <span style={{ color: 'rgba(245,242,236,0.62)', textDecoration: 'underline', cursor: 'pointer' }}>Términos de servicio</span>
            {' '}y{' '}
            <span style={{ color: 'rgba(245,242,236,0.62)', textDecoration: 'underline', cursor: 'pointer' }}>Política de privacidad</span>
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          DESKTOP — two-column grid
      ═══════════════════════════════════════ */}
      <div className="hidden md:grid md:grid-cols-[1.1fr_1fr] min-h-dvh">

        {/* Left panel — shop photo */}
        <div className="flex flex-col relative overflow-hidden">
          <img
            src="/assets/shop-interior-1.png"
            alt={`${shopName} interior`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(10,10,11,0.52) 0%, rgba(10,10,11,0.78) 100%)',
          }} />

          <div style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            padding: '2.5rem',
          }}>
            <Logo size={40} />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(52px, 7vw, 88px)',
                lineHeight: 0.9,
                color: '#fff',
                marginBottom: '0.5rem',
              }}>
                Reserva tu<br />
                <span style={{ color: 'var(--gold)' }}>asiento</span><br />
                del barbero
              </div>
              <div style={{ width: 48, height: 2, background: 'var(--gold)', margin: '1rem 0' }} />
              <p style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 15,
                color: 'rgba(245,242,236,0.65)',
                lineHeight: 1.6,
                maxWidth: 360,
              }}>
                La experiencia de barbería premium. Reserva online, acumula puntos y disfruta de recompensas exclusivas.
              </p>
            </div>

            {/* Shop info — SVG icons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {shopInfoItems.map(({ Icon, text, href }) => {
                const inner = (
                  <>
                    <Icon size={15} color="var(--gold)" />
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'rgba(245,242,236,0.55)' }}>
                      {text}
                    </span>
                  </>
                )
                return href ? (
                  <a key={text} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                    {inner}
                  </a>
                ) : (
                  <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {inner}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right panel — OAuth form */}
        <div
          className="flex flex-col items-center justify-center overflow-y-auto px-10 py-8"
          style={{ background: 'var(--bg-0)' }}
        >
          <div style={{ width: '100%', maxWidth: 360 }}>
            {/* Heading */}
            <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 11,
                letterSpacing: '0.18em',
                color: 'var(--fg-3)',
                marginBottom: '0.5rem',
              }}>
                BIENVENIDO A
              </div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 26,
                letterSpacing: '0.06em',
                color: 'var(--fg-0)',
                marginBottom: '0.5rem',
              }}>
                {shopName.toUpperCase()}
              </div>
              <div style={{ width: 32, height: 2, background: 'var(--led)', margin: '0 auto' }} />
            </div>

            {/* OAuth buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <button
                onClick={handleGoogle}
                disabled={loading !== null}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  minHeight: 52,
                  padding: '0 1.25rem',
                  borderRadius: 10,
                  border: '1px solid var(--line)',
                  background: loading === 'google' ? 'var(--bg-3)' : 'var(--bg-2)',
                  color: 'var(--fg-0)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: loading !== null ? 'wait' : 'pointer',
                  opacity: loading !== null && loading !== 'google' ? 0.5 : 1,
                  transition: 'all 0.15s',
                }}
              >
                {loading === 'google' ? (
                  <span style={{ opacity: 0.6 }}>Conectando…</span>
                ) : (
                  <>
                    <GoogleLogo size={20} />
                    Continuar con Google
                  </>
                )}
              </button>

              <button
                onClick={handleApple}
                disabled={loading !== null}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  minHeight: 52,
                  padding: '0 1.25rem',
                  borderRadius: 10,
                  border: '1px solid var(--line)',
                  background: loading === 'apple' ? 'var(--bg-3)' : 'var(--bg-2)',
                  color: 'var(--fg-0)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: loading !== null ? 'wait' : 'pointer',
                  opacity: loading !== null && loading !== 'apple' ? 0.5 : 1,
                  transition: 'all 0.15s',
                }}
              >
                {loading === 'apple' ? (
                  <span style={{ opacity: 0.6 }}>Conectando…</span>
                ) : (
                  <>
                    <AppleLogo size={20} color="var(--fg-0)" />
                    Continuar con Apple
                  </>
                )}
              </button>
            </div>

            {error && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: 8,
                background: 'rgba(192,64,64,0.1)',
                border: '1px solid rgba(192,64,64,0.3)',
                color: 'var(--danger)',
                fontFamily: 'var(--font-ui)',
                fontSize: 13,
                textAlign: 'center',
              }}>
                {error}
              </div>
            )}

            <p style={{
              marginTop: '2rem',
              textAlign: 'center',
              fontSize: 11,
              fontFamily: 'var(--font-ui)',
              color: 'var(--fg-3)',
              lineHeight: 1.6,
            }}>
              Al continuar aceptas nuestros{' '}
              <span style={{ color: 'var(--fg-2)', textDecoration: 'underline', cursor: 'pointer' }}>Términos de servicio</span>
              {' '}y{' '}
              <span style={{ color: 'var(--fg-2)', textDecoration: 'underline', cursor: 'pointer' }}>Política de privacidad</span>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
