import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'
import { useAuth } from '@/hooks'
import { Logo } from '@/components/layout'

type AuthMode = 'login' | 'register' | 'forgot' | 'reset'

const pageTitles: Record<AuthMode, string> = {
  login: 'Acceder',
  register: 'Crear cuenta',
  forgot: 'Recuperar contraseña',
  reset: 'Nueva contraseña',
}

// InsForge sends reset email with ?token= query param in the redirectTo URL
function getResetToken(): string | null {
  return new URLSearchParams(window.location.search).get('token')
}

function getInitialMode(): AuthMode {
  return getResetToken() !== null ? 'reset' : 'login'
}

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>(getInitialMode)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user || mode === 'reset') return
    navigate(user.role === 'admin' ? '/admin/dashboard' : '/calendar', { replace: true })
  }, [user, navigate, mode])

  const handleResetSuccess = () => {
    window.history.replaceState(null, '', window.location.pathname)
    setMode('login')
  }

  const resetToken = getResetToken() ?? ''

  return (
    <>
      <Helmet>
        <title>{pageTitles[mode]} — Gio Barber Shop</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', minHeight: '100dvh' }}>
        {/* Left panel — shop photo */}
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }} className="auth-left-panel">
          <img
            src="/assets/shop-interior-1.png"
            alt="Gio Barber Shop interior"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />
          {/* Overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(10,10,11,0.55) 0%, rgba(10,10,11,0.75) 100%)',
          }} />

          {/* Content */}
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
              <div style={{
                width: 48,
                height: 2,
                background: 'var(--gold)',
                margin: '1rem 0',
              }} />
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

        {/* Right panel — forms */}
        <div style={{
          background: 'var(--bg-0)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 2.5rem',
          overflowY: 'auto',
        }}>
          <div style={{ width: '100%', maxWidth: 380 }}>
            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                letterSpacing: '0.05em',
                color: 'var(--fg-0)',
                marginBottom: '0.25rem',
              }}>
                {pageTitles[mode].toUpperCase()}
              </h1>
              <div style={{ width: 32, height: 2, background: 'var(--led)' }} />
            </div>

            {mode === 'login' && <LoginForm onForgot={() => setMode('forgot')} />}
            {mode === 'register' && <RegisterForm />}
            {mode === 'forgot' && <ForgotPasswordForm onBackToLogin={() => setMode('login')} />}
            {mode === 'reset' && <ResetPasswordForm otp={resetToken} onSuccess={handleResetSuccess} />}

            {(mode === 'login' || mode === 'register') && (
              <p style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--fg-2)' }}>
                {mode === 'login' ? (
                  <>
                    ¿No tienes cuenta?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('register')}
                      style={{ background: 'none', border: 'none', color: 'var(--gold)', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13 }}
                    >
                      Regístrate gratis
                    </button>
                  </>
                ) : (
                  <>
                    ¿Ya tienes cuenta?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      style={{ background: 'none', border: 'none', color: 'var(--gold)', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13 }}
                    >
                      Iniciar sesión
                    </button>
                  </>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .auth-left-panel { display: none !important; }
          div[style*="grid-template-columns: 1.1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  )
}
