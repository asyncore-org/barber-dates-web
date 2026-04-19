import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { useAuth } from '@/hooks'

type AuthMode = 'login' | 'register'

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const { user } = useAuth()
  const navigate = useNavigate()

  // Redirect if already authenticated
  useEffect(() => {
    if (!user) return
    navigate(user.role === 'admin' ? '/admin/dashboard' : '/calendar', { replace: true })
  }, [user, navigate])

  return (
    <>
      <Helmet>
        <title>Acceder — Gio Barber Shop</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] px-4">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-white">Gio Barber Shop</h1>
            <p className="mt-1 text-sm text-white/50">
              {mode === 'login' ? 'Accede a tu cuenta' : 'Crea tu cuenta gratis'}
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            {mode === 'login' ? (
              <LoginForm />
            ) : (
              <RegisterForm />
            )}
          </div>

          {/* Mode toggle */}
          <p className="mt-5 text-center text-sm text-white/50">
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
        </div>
      </div>
    </>
  )
}
