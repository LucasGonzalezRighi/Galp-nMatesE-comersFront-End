'use client'

import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button, Field, Input } from '@/components/ui'
import { asRoute } from '@/lib/routes'
import { isApiError, resetPassword } from '@galpon/api-client'
import { useApiClient } from '@galpon/api-client/react'
import { resetPasswordSchema } from '@galpon/schemas'
import { ACCOUNT_COPY } from './account.copy'
import { resetAccountState, withCsrf } from './csrf'
import { showSubmitError } from './form-errors'
import { Confirmation, FORM_CARD, FormError } from './form-parts'
import { LOGIN_PATH } from './return-path'

/** Campos que la API puede marcar con error. */
const FIELDS = ['token', 'password'] as const

/**
 * Formulario de `/cuenta/restablecer`: contraseña nueva y su confirmación (`resetPasswordSchema`).
 * El código viene en `?token=` del enlace del email; si la dirección no lo trae, se pide en un
 * campo. Si la API dice que el enlace no sirve, ofrece pedir uno nuevo. Al cambiarla se cierran
 * las sesiones de la cuenta, así que se olvidan los datos de la sesión.
 *
 * Lee `token` con `useSearchParams`: va dentro de un `<Suspense>`.
 */
export function ResetPasswordForm(): ReactNode {
  const api = useApiClient()
  const queryClient = useQueryClient()
  const tokenFromLink = useSearchParams().get('token') ?? ''
  const [done, setDone] = useState(false)
  const {
    register: field,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onTouched',
    defaultValues: { token: tokenFromLink, password: '', passwordConfirmation: '' },
  })

  const onSubmit = handleSubmit(async ({ token, password }) => {
    try {
      await withCsrf(queryClient, api, () => resetPassword(api, { token, password }))
    } catch (error) {
      const invalidLink = isApiError(error) && error.fieldErrors.token !== undefined
      if (invalidLink && tokenFromLink !== '') {
        setError('root.server', { message: ACCOUNT_COPY.reset.invalidLink })
      } else {
        showSubmitError(error, FIELDS, setError)
      }
      return
    }
    await resetAccountState(queryClient)
    setDone(true)
  })

  if (done) {
    return (
      <Confirmation title={ACCOUNT_COPY.reset.doneTitle} text={ACCOUNT_COPY.reset.doneText}>
        <Button asChild>
          <Link href={asRoute(LOGIN_PATH)}>{ACCOUNT_COPY.reset.login}</Link>
        </Button>
      </Confirmation>
    )
  }

  const serverError = errors.root?.server?.message
  return (
    <form
      noValidate
      aria-busy={isSubmitting}
      className={FORM_CARD}
      onSubmit={(event) => {
        void onSubmit(event)
      }}
    >
      {tokenFromLink === '' ? (
        <Field label={ACCOUNT_COPY.resetToken} error={errors.token?.message}>
          {(control) => <Input {...control} {...field('token')} autoComplete="one-time-code" />}
        </Field>
      ) : null}
      <Field
        label={ACCOUNT_COPY.newPassword}
        hint={ACCOUNT_COPY.passwordHint}
        error={errors.password?.message}
      >
        {(control) => (
          <Input {...control} {...field('password')} type="password" autoComplete="new-password" />
        )}
      </Field>
      <Field label={ACCOUNT_COPY.passwordConfirmation} error={errors.passwordConfirmation?.message}>
        {(control) => (
          <Input
            {...control}
            {...field('passwordConfirmation')}
            type="password"
            autoComplete="new-password"
          />
        )}
      </Field>
      <FormError message={serverError} />
      {serverError === ACCOUNT_COPY.reset.invalidLink ? (
        <Link
          href={asRoute('/cuenta/recuperar')}
          className="text-accent self-start text-[13px] underline"
        >
          {ACCOUNT_COPY.reset.requestAnother}
        </Link>
      ) : null}
      <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
        {isSubmitting ? ACCOUNT_COPY.submitting : ACCOUNT_COPY.reset.submit}
      </Button>
    </form>
  )
}
