import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks'

const schema = z.object({
  email: z.string().email('Email inválido'),
})

type FormValues = z.infer<typeof schema>

interface ForgotPasswordFormProps {
  onBackToLogin?: () => void
}

const fieldCls = 'border-white/20 bg-[#111111] text-white placeholder:text-white/45 focus-visible:ring-[#C8A44E]'

export function ForgotPasswordForm({ onBackToLogin }: ForgotPasswordFormProps) {
  const { requestPasswordReset } = useAuth()
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setServerError(null)
    try {
      await requestPasswordReset(values.email)
      setSent(true)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Error al enviar el email')
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4 text-center text-white">
        <div className="rounded-xl bg-white/10 p-5">
          <p className="font-semibold">Email enviado</p>
          <p className="mt-1 text-sm text-white/70">
            Si <span className="text-white/90">{getValues('email')}</span> está registrado,
            recibirás un enlace para restablecer tu contraseña en los próximos minutos.
          </p>
        </div>
        {onBackToLogin && (
          <button
            type="button"
            onClick={onBackToLogin}
            className="text-sm text-[#C8A44E] hover:underline"
          >
            Volver al inicio de sesión
          </button>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <p className="text-sm text-white/65">
        Introduce tu email y te enviaremos un enlace para restablecer tu contraseña.
      </p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="forgot-email" className="text-white/85">Email</Label>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          className={fieldCls}
          aria-describedby={errors.email ? 'forgot-email-error' : undefined}
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && (
          <p id="forgot-email-error" className="text-sm text-[#EF4444]" role="alert">
            {errors.email.message}
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
        {isSubmitting ? 'Enviando...' : 'Enviar enlace de recuperación'}
      </Button>

      {onBackToLogin && (
        <button
          type="button"
          onClick={onBackToLogin}
          className="text-sm text-white/50 hover:text-white/80 transition-colors"
        >
          ← Volver al inicio de sesión
        </button>
      )}
    </form>
  )
}
