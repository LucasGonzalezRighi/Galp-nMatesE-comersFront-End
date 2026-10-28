import { zodResolver } from '@hookform/resolvers/zod'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { AdminLoginResult } from '@galpon/api-client'
import type { AdminLogin, AdminLoginInput } from '@galpon/schemas'
import { adminLogin, isApiError } from '@galpon/api-client'
import { useApiClient } from '@galpon/api-client/react'
import { adminLoginSchema } from '@galpon/schemas'

/** Props de {@link LoginForm}. */
export interface LoginFormProps {
  /** Se llama con la sesión recién abierta cuando el login sale bien. */
  onSuccess: (session: AdminLoginResult) => void
  /** Email con el que arranca el campo (por ejemplo, el de la sesión que venció). */
  defaultEmail?: string
}

const INPUT_CLASS =
  'w-full rounded-md bg-background px-3 py-2 text-foreground shadow-sm placeholder:text-neutral-600 aria-invalid:shadow-[0_0_0_1px_var(--color-danger-border)]'

/**
 * Formulario de inicio de sesión del dashboard.
 *
 * Valida con `adminLoginSchema` al salir de cada campo y al enviar. Si la API responde 401 muestra
 * "Email o contraseña incorrectos"; sin conexión, "No pudimos conectar, probá de nuevo"; con 422
 * pone el mensaje del servidor en cada campo.
 *
 * @param props - Ver {@link LoginFormProps}.
 */
export function LoginForm({ onSuccess, defaultEmail = '' }: LoginFormProps) {
  const api = useApiClient()
  const [formError, setFormError] = useState<string | null>(null)
  const emailId = useId()
  const passwordId = useId()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginInput, undefined, AdminLogin>({
    resolver: zodResolver(adminLoginSchema),
    mode: 'onTouched',
    defaultValues: { email: defaultEmail, password: '' },
  })

  const submit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      onSuccess(await adminLogin(api, values))
    } catch (error) {
      if (!isApiError(error)) throw error
      if (error.kind === 'unauthorized') {
        setFormError('Email o contraseña incorrectos')
      } else if (error.kind === 'network') {
        setFormError('No pudimos conectar, probá de nuevo')
      } else {
        const emailMessage = error.fieldErrors.email
        const passwordMessage = error.fieldErrors.password
        if (emailMessage !== undefined) setError('email', { message: emailMessage })
        if (passwordMessage !== undefined) setError('password', { message: passwordMessage })
        if (emailMessage === undefined && passwordMessage === undefined) {
          setFormError(error.message)
        }
      }
    }
  })

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void submit(event)
      }}
      className="flex flex-col gap-4"
    >
      {formError !== null && (
        <p
          role="alert"
          className="text-danger rounded-md px-3 py-2 shadow-[0_0_0_1px_var(--color-danger-border)]"
        >
          {formError}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor={emailId} className="text-neutral-300">
          Email
        </label>
        <input
          id={emailId}
          type="email"
          autoComplete="username"
          aria-invalid={errors.email !== undefined}
          aria-describedby={errors.email === undefined ? undefined : `${emailId}-error`}
          className={INPUT_CLASS}
          {...register('email')}
        />
        {errors.email !== undefined && (
          <p id={`${emailId}-error`} className="text-danger">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={passwordId} className="text-neutral-300">
          Contraseña
        </label>
        <input
          id={passwordId}
          type="password"
          autoComplete="current-password"
          aria-invalid={errors.password !== undefined}
          aria-describedby={errors.password === undefined ? undefined : `${passwordId}-error`}
          className={INPUT_CLASS}
          {...register('password')}
        />
        {errors.password !== undefined && (
          <p id={`${passwordId}-error`} className="text-danger">
            {errors.password.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-accent-500 text-background hover:bg-accent-400 rounded-md px-4 py-2 font-medium disabled:opacity-60"
      >
        {isSubmitting ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  )
}
