import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks'

const schema = z
  .object({
    fullName: z.string().min(2, 'Nombre demasiado corto'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
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

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { signUp } = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)
  const [pendingConfirmation, setPendingConfirmation] = useState(false)

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reg-name">Nombre completo</Label>
        <Input
          id="reg-name"
          type="text"
          autoComplete="name"
          placeholder="Giovanni Russo"
          {...register('fullName')}
        />
        {errors.fullName && (
          <p className="text-sm text-[#EF4444]">{errors.fullName.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reg-email">Email</Label>
        <Input
          id="reg-email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-[#EF4444]">{errors.email.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reg-password">Contraseña</Label>
        <Input
          id="reg-password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••"
          {...register('password')}
        />
        {errors.password && (
          <p className="text-sm text-[#EF4444]">{errors.password.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reg-confirm">Repetir contraseña</Label>
        <Input
          id="reg-confirm"
          type="password"
          autoComplete="new-password"
          placeholder="••••••"
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-[#EF4444]">{errors.confirmPassword.message}</p>
        )}
      </div>

      {serverError && (
        <p className="text-sm text-[#EF4444]">{serverError}</p>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[#C8A44E] text-black hover:bg-[#b8943e] font-semibold"
      >
        {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta gratis'}
      </Button>
    </form>
  )
}
