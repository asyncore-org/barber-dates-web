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
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

interface ResetPasswordFormProps {
  otp: string
  onSuccess?: () => void
}

const fieldCls = 'border-white/20 bg-[#111111] text-white placeholder:text-white/45 focus-visible:ring-[#C8A44E]'

export function ResetPasswordForm({ otp, onSuccess }: ResetPasswordFormProps) {
  const { updatePassword } = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setServerError(null)
    try {
      await updatePassword(values.password, otp)
      onSuccess?.()
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Error al actualizar la contraseña')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <p className="text-sm text-white/65">
        Elige una nueva contraseña segura para tu cuenta.
      </p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reset-password" className="text-white/85">Nueva contraseña</Label>
        <div className="relative">
          <Input
            id="reset-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            className={`${fieldCls} pr-10`}
            aria-describedby={errors.password ? 'reset-password-error' : undefined}
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
          <p id="reset-password-error" className="text-sm text-[#EF4444]" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reset-confirm" className="text-white/85">Confirmar contraseña</Label>
        <div className="relative">
          <Input
            id="reset-confirm"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            className={`${fieldCls} pr-10`}
            aria-describedby={errors.confirmPassword ? 'reset-confirm-error' : undefined}
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
          <p id="reset-confirm-error" className="text-sm text-[#EF4444]" role="alert">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {serverError && (
        <p className="text-sm text-[#EF4444]" role="alert">{serverError}</p>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[#C8A44E] text-black hover:bg-[#b8943e] font-semibold"
      >
        {isSubmitting ? 'Guardando...' : 'Guardar nueva contraseña'}
      </Button>
    </form>
  )
}
