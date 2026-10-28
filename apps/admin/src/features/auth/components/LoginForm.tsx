import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { AdminLoginResult } from '@galpon/api-client'
import type { AdminLogin, AdminLoginInput } from '@galpon/schemas'
import { adminLogin, isApiError } from '@galpon/api-client'
import { useApiClient } from '@galpon/api-client/react'
import { adminLoginSchema } from '@galpon/schemas'
import { Button } from '../../../components/ui/Button'
import { Field } from '../../../components/ui/Field'
import { TextInput } from '../../../components/ui/TextInput'
import { AUTH_COPY } from '../auth.copy'

/** Props de {@link LoginForm}. */
export interface LoginFormProps {
  /** Se llama con la sesión recién abierta cuando el login sale bien. */
  onSuccess: (session: AdminLoginResult) => void
  /** Email con el que arranca el campo (por ejemplo, el de la sesión que venció). */
  defaultEmail?: string
}

/**
 * Formulario de inicio de sesión del dashboard (también dentro de "Tu sesión venció"), con los
 * campos y el botón del kit (`Field`, `TextInput` y `Button` con "Ingresando…" mientras envía).
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
        setFormError(AUTH_COPY.wrongCredentials)
      } else if (error.kind === 'network') {
        setFormError(AUTH_COPY.networkError)
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

      <Field label={AUTH_COPY.email} error={errors.email?.message}>
        {(control) => (
          <TextInput {...control} type="email" autoComplete="username" {...register('email')} />
        )}
      </Field>

      <Field label={AUTH_COPY.password} error={errors.password?.message}>
        {(control) => (
          <TextInput
            {...control}
            type="password"
            autoComplete="current-password"
            {...register('password')}
          />
        )}
      </Field>

      <Button type="submit" isLoading={isSubmitting}>
        {isSubmitting ? AUTH_COPY.loggingIn : AUTH_COPY.logIn}
      </Button>
    </form>
  )
}
