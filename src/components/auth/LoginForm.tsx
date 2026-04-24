import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type FormValues = z.infer<typeof schema>

interface LoginFormProps {
  onSuccess?: () => void
  onForgot?: () => void
}

const fieldCls = 'border-white/20 bg-[#111111] text-white placeholder:text-white/45 focus-visible:ring-[#C8A44E]'

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        fill="#EA4335"
        d="M12 5.84c1.69 0 3.2.58 4.39 1.72l3.27-3.27C17.66 2.43 14.98 1.25 12 1.25 7.53 1.25 3.67 3.79 1.78 7.5l3.8 2.95C6.5 7.71 9 5.84 12 5.84z"
      />
      <path
        fill="#4285F4"
        d="M22.75 12.25c0-.76-.07-1.48-.2-2.18H12v4.13h6.03a5.16 5.16 0 0 1-2.24 3.39l3.45 2.67c2.01-1.85 3.51-4.58 3.51-8.01z"
      />
      <path
        fill="#FBBC05"
        d="M5.58 13.55a5.95 5.95 0 0 1-.33-1.95c0-.67.12-1.32.33-1.95L1.78 6.7A10.73 10.73 0 0 0 1 11.6c0 1.73.41 3.36 1.13 4.9l3.45-2.95z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.98 0 5.48-.98 7.3-2.67l-3.45-2.67c-.96.65-2.2 1.03-3.85 1.03-2.99 0-5.5-1.87-6.42-4.61l-3.45 2.95C3.67 19.71 7.53 22 12 22z"
      />
    </svg>
  )
}

export function LoginForm({ onSuccess, onForgot }: LoginFormProps) {
  const { signIn, signInWithGoogle, isGoogleEnabled } = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setServerError(null)
    try {
      await signIn(values.email, values.password)
      onSuccess?.()
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    }
  }

  const onGoogleSignIn = async () => {
    setServerError(null)
    setIsGoogleLoading(true)
    try {
      await signInWithGoogle()
      onSuccess?.()
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Error al iniciar con Google')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const isBusy = isSubmitting || isGoogleLoading

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-email" className="text-white/85">Email</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          className={fieldCls}
          aria-describedby={errors.email ? 'login-email-error' : undefined}
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && (
          <p id="login-email-error" className="text-sm text-[#EF4444]" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password" className="text-white/85">Contraseña</Label>
          {onForgot && (
            <button
              type="button"
              onClick={onForgot}
              className="text-xs text-[#C8A44E] hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}
        </div>
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••"
            className={`${fieldCls} pr-10`}
            aria-describedby={errors.password ? 'login-password-error' : undefined}
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && (
          <p id="login-password-error" className="text-sm text-[#EF4444]" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>

      {serverError && (
        <p className="text-sm text-[#EF4444]" role="alert">{serverError}</p>
      )}

      <Button
        type="submit"
        disabled={isBusy}
        className="w-full bg-[#C8A44E] text-black hover:bg-[#b8943e] font-semibold"
      >
        {isSubmitting ? 'Entrando...' : 'Iniciar sesión'}
      </Button>

      {isGoogleEnabled && (
        <>
          <div className="flex items-center gap-3 text-xs text-white/40">
            <div className="h-px flex-1 bg-white/15" />
            o
            <div className="h-px flex-1 bg-white/15" />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={onGoogleSignIn}
            disabled={isBusy}
            className="w-full border-[#d6d9e0] bg-white text-[#1f1f1f] hover:bg-[#f7f8fa] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
          >
            <GoogleLogo />
            {isGoogleLoading ? 'Conectando...' : 'Continuar con Google'}
          </Button>
        </>
      )}
    </form>
  )
}
