import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'
import { useAuth } from '@/hooks'

type AuthMode = 'login' | 'register' | 'forgot' | 'reset'

const pageTitles: Record<AuthMode, string> = {
  login: 'Acceder',
  register: 'Crear cuenta',
  forgot: 'Recuperar contraseña',
  reset: 'Nueva contraseña',
}

const pageSubtitles: Record<AuthMode, string> = {
  login: 'Accede a tu cuenta',
  register: 'Crea tu cuenta gratis',
  forgot: 'Recupera el acceso a tu cuenta',
  reset: 'Elige una nueva contraseña',
}

function getInitialMode(): AuthMode {
  return window.location.hash.includes('type=recovery') ? 'reset' : 'login'
}

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>(getInitialMode)
  const { user } = useAuth()
  const navigate = useNavigate()

  // Redirect if already authenticated (except during password reset)
  useEffect(() => {
    if (!user || mode === 'reset') return
    navigate(user.role === 'admin' ? '/admin/dashboard' : '/calendar', { replace: true })
  }, [user, navigate, mode])

  const handleResetSuccess = () => {
    // Clear the hash so refresh doesn't re-activate reset mode
    window.history.replaceState(null, '', window.location.pathname)
    setMode('login')
  }

  return (
    <>
      <Helmet>
        <title>{pageTitles[mode]} — Gio Barber Shop</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,_#2c2c2c_0%,_#1a1a1a_45%,_#101010_100%)] px-4">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white">Gio Barber Shop</h1>
            <p className="mt-2 text-sm text-white/65">{pageSubtitles[mode]}</p>
          </div>

          {/* Card */}
          <div className="rounded-2xl bg-[#202020]/95 border border-white/15 p-6 shadow-2xl shadow-black/35">
            {mode === 'login' && (
              <LoginForm
                onForgot={() => setMode('forgot')}
              />
            )}
            {mode === 'register' && (
              <RegisterForm />
            )}
            {mode === 'forgot' && (
              <ForgotPasswordForm
                onBackToLogin={() => setMode('login')}
              />
            )}
            {mode === 'reset' && (
              <ResetPasswordForm
                onSuccess={handleResetSuccess}
              />
            )}
          </div>

          {/* Mode toggle — only for login/register */}
          {(mode === 'login' || mode === 'register') && (
            <p className="mt-5 text-center text-sm text-white/65">
              {mode === 'login' ? (
                <>
                  ¿No tienes cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className="text-[#C8A44E] hover:underline font-medium"
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
                    className="text-[#C8A44E] hover:underline font-medium"
                  >
                    Iniciar sesión
                  </button>
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </>
  )
}
