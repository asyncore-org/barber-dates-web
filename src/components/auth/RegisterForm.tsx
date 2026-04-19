import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks'

const schema = z
  .object({
    fullName: z.string().min(2, 'Nombre demasiado corto'),
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

interface RegisterFormProps {
  onSuccess?: () => void
}

const fieldCls = 'border-white/20 bg-[#111111] text-white placeholder:text-white/45 focus-visible:ring-[#C8A44E]'

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { signUp, signInWithGoogle, isGoogleEnabled } = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)
  const [pendingConfirmation, setPendingConfirmation] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setServerError(null)
    try {
      await signUp(values.email, values.password, values.fullName)
      onSuccess?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear la cuenta'
      if (message.includes('Revisa tu email')) {
        setPendingConfirmation(true)
      } else {
        setServerError(message)
      }
    }
  }

  const onGoogleSignIn = async () => {
    setServerError(null)
    setIsGoogleLoading(true)
    try {
      await signInWithGoogle()
      onSuccess?.()
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Error al conectar con Google')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  if (pendingConfirmation) {
    return (
      <div className="rounded-xl bg-white/10 p-5 text-center text-white">
        <p className="font-semibold">Revisa tu email</p>
        <p className="mt-1 text-sm text-white/70">
          Te hemos enviado un enlace de confirmación. Abre tu email para activar tu cuenta.
        </p>
      </div>
    )
  }

  const isBusy = isSubmitting || isGoogleLoading

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reg-name" className="text-white/85">Nombre completo</Label>
        <Input
          id="reg-name"
          type="text"
          autoComplete="name"
          placeholder="Giovanni Russo"
          className={fieldCls}
          aria-describedby={errors.fullName ? 'reg-name-error' : undefined}
          aria-invalid={!!errors.fullName}
          {...register('fullName')}
        />
        {errors.fullName && (
          <p id="reg-name-error" className="text-sm text-[#EF4444]" role="alert">
            {errors.fullName.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reg-email" className="text-white/85">Email</Label>
        <Input
          id="reg-email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          className={fieldCls}
          aria-describedby={errors.email ? 'reg-email-error' : undefined}
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && (
          <p id="reg-email-error" className="text-sm text-[#EF4444]" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reg-password" className="text-white/85">Contraseña</Label>
        <div className="relative">
          <Input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            className={`${fieldCls} pr-10`}
            aria-describedby={errors.password ? 'reg-password-error' : undefined}
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
          <p id="reg-password-error" className="text-sm text-[#EF4444]" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reg-confirm" className="text-white/85">Repetir contraseña</Label>
        <div className="relative">
          <Input
            id="reg-confirm"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            className={`${fieldCls} pr-10`}
            aria-describedby={errors.confirmPassword ? 'reg-confirm-error' : undefined}
            aria-invalid={!!errors.confirmPassword}
            {...register('confirmPassword')}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
            aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            tabIndex={-1}
          >
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p id="reg-confirm-error" className="text-sm text-[#EF4444]" role="alert">
            {errors.confirmPassword.message}
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
        {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta gratis'}
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
            className="w-full border-white/20 bg-white text-[#1a1a1a] hover:bg-white/90 font-semibold"
          >
            {isGoogleLoading ? 'Conectando...' : 'Continuar con Google'}
          </Button>
        </>
      )}
    </form>
  )
}
