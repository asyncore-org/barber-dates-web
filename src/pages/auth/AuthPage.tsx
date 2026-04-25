import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '@/hooks'
import { useShopContext } from '@/context/ShopContext'
import { Logo } from '@/components/layout'

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

  return (
    <>
      <Helmet>
        <title>Acceder — {shopName}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="grid md:grid-cols-[1.1fr_1fr] min-h-dvh">
        {/* Left panel — shop photo (hidden on mobile) */}
        <div className="hidden md:flex flex-col relative overflow-hidden">
          <img
            src="/assets/shop-interior-1.png"
            alt={`${shopName} interior`}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(10,10,11,0.55) 0%, rgba(10,10,11,0.75) 100%)',
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
                <span style={{ color: 'var(--led-soft)' }}>asiento</span><br />
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { icon: '📍', text: 'Calle Gran Via 12, Barcelona' },
                { icon: '🕐', text: 'Lun – Sáb, 9:00 – 20:00' },
                { icon: '📞', text: '+34 931 234 567' },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'rgba(245,242,236,0.5)' }}>
                  <span>{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel — OAuth */}
        <div
          className="flex flex-col items-center justify-center overflow-y-auto p-5 md:px-10 md:py-8"
          style={{ background: 'var(--bg-0)' }}
        >
          <div style={{ width: '100%', maxWidth: 360 }}>
            {/* Mobile logo */}
            <div className="flex justify-center mb-8 md:hidden">
              <Logo size={36} />
            </div>

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
                  transition: 'all 0.15s',
                }}
              >
                {loading === 'google' ? (
                  <span style={{ opacity: 0.6 }}>Conectando…</span>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
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
                  transition: 'all 0.15s',
                }}
              >
                {loading === 'apple' ? (
                  <span style={{ opacity: 0.6 }}>Conectando…</span>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    Continuar con Apple
                  </>
                )}
              </button>
            </div>

            {/* Error */}
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

            {/* Legal */}
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
