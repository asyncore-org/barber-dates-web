import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks'
import { isGoogleConfigured } from '@/infrastructure/auth/authRepository'

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

export function LoginForm({ onSuccess, onForgot }: LoginFormProps) {
  const { signIn, signInWithGoogle } = useAuth()
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

      {isGoogleConfigured && (
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
            className="w-full border-white/20 bg-white text-[#1a1a1a] hover:bg-white/90 font-semibold"
          >
            {isGoogleLoading ? 'Conectando...' : 'Continuar con Google'}
          </Button>
        </>
      )}
    </form>
  )
}
