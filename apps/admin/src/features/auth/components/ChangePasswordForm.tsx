import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { AdminPasswordChange, AdminPasswordChangeInput } from '@galpon/schemas'
import { changeAdminPassword, isApiError } from '@galpon/api-client'
import { useApiClient } from '@galpon/api-client/react'
import { adminPasswordChangeSchema } from '@galpon/schemas'
import { Button } from '../../../components/ui/Button'
import { Field } from '../../../components/ui/Field'
import { TextInput } from '../../../components/ui/TextInput'
import { toast } from '../../../components/ui/toast'
import { AUTH_COPY } from '../auth.copy'

/** Campos del formulario, en el orden en que pueden venir los errores del `422`. */
const FIELDS = ['currentPassword', 'newPassword', 'confirmation'] as const

/** Formulario vacío: así arranca y así queda después de cambiar la contraseña. */
const EMPTY: AdminPasswordChangeInput = { currentPassword: '', newPassword: '', confirmation: '' }

/**
 * Formulario para cambiar la contraseña del administrador (`adminPasswordChangeSchema`):
 * "Contraseña actual", "Contraseña nueva" y "Repetí la contraseña nueva". Al cambiarla avisa
 * "Contraseña cambiada." y vacía el formulario; un `422` va a cada campo y otro error, a un
 * toast. El `401` y el `403` los maneja la estructura (la sesión sigue abierta en los dos casos).
 */
export function ChangePasswordForm(): ReactNode {
  const api = useApiClient()
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<AdminPasswordChangeInput, undefined, AdminPasswordChange>({
    resolver: zodResolver(adminPasswordChangeSchema),
    mode: 'onTouched',
    defaultValues: EMPTY,
  })
  const change = useMutation({
    mutationFn: (values: AdminPasswordChange) => changeAdminPassword(api, values),
    onSuccess: () => {
      reset(EMPTY)
      toast.success(AUTH_COPY.passwordChanged)
    },
    onError: (error) => {
      if (!isApiError(error)) {
        toast.error(AUTH_COPY.unexpectedError)
        return
      }
      // "Tu sesión venció" (401) y el token CSRF rotado (403) los resuelve la estructura.
      if (error.kind === 'unauthorized' || error.kind === 'forbidden') return
      const withError = FIELDS.filter((field) => error.fieldErrors[field] !== undefined)
      for (const field of withError) setError(field, { message: error.fieldErrors[field] })
      if (withError.length === 0) toast.error(error.message)
    },
  })
  const submit = handleSubmit((values) => {
    change.mutate(values)
  })

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void submit(event)
      }}
      className="flex max-w-md flex-col gap-4"
    >
      <Field label={AUTH_COPY.currentPassword} error={errors.currentPassword?.message}>
        {(control) => (
          <TextInput
            {...control}
            type="password"
            autoComplete="current-password"
            {...register('currentPassword')}
          />
        )}
      </Field>
      <Field
        label={AUTH_COPY.newPassword}
        hint={AUTH_COPY.newPasswordHint}
        error={errors.newPassword?.message}
      >
        {(control) => (
          <TextInput
            {...control}
            type="password"
            autoComplete="new-password"
            {...register('newPassword')}
          />
        )}
      </Field>
      <Field label={AUTH_COPY.confirmation} error={errors.confirmation?.message}>
        {(control) => (
          <TextInput
            {...control}
            type="password"
            autoComplete="new-password"
            {...register('confirmation')}
          />
        )}
      </Field>
      <Button type="submit" isLoading={change.isPending} className="self-start">
        {change.isPending ? AUTH_COPY.changingPassword : AUTH_COPY.changePassword}
      </Button>
    </form>
  )
}
