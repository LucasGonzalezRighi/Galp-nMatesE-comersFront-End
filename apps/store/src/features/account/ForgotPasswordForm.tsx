'use client'

import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button, Field, Input } from '@/components/ui'
import { asRoute } from '@/lib/routes'
import { forgotPassword } from '@galpon/api-client'
import { useApiClient } from '@galpon/api-client/react'
import { forgotPasswordSchema } from '@galpon/schemas'
import { ACCOUNT_COPY } from './account.copy'
import { withCsrf } from './csrf'
import { showSubmitError } from './form-errors'
import { Confirmation, FORM_CARD, FormError } from './form-parts'
import { LOGIN_PATH } from './return-path'

/** Campos que la API puede marcar con error. */
const FIELDS = ['email'] as const

/**
 * Formulario de `/cuenta/recuperar`: pide el email (`forgotPasswordSchema`) y solicita el enlace
 * para elegir una contraseña nueva. La respuesta es la misma exista o no la cuenta, así que la
 * confirmación tampoco lo revela.
 */
export function ForgotPasswordForm(): ReactNode {
  const api = useApiClient()
  const queryClient = useQueryClient()
  const [sent, setSent] = useState(false)
  const {
    register: field,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onTouched',
    defaultValues: { email: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await withCsrf(queryClient, api, () => forgotPassword(api, values))
      setSent(true)
    } catch (error) {
      showSubmitError(error, FIELDS, setError)
    }
  })

  if (sent) {
    return (
      <Confirmation title={ACCOUNT_COPY.forgot.sentTitle} text={ACCOUNT_COPY.forgot.sentText}>
        <Button asChild variant="secondary">
          <Link href={asRoute(LOGIN_PATH)}>{ACCOUNT_COPY.forgot.back}</Link>
        </Button>
      </Confirmation>
    )
  }

  return (
    <form
      noValidate
      aria-busy={isSubmitting}
      className={FORM_CARD}
      onSubmit={(event) => {
        void onSubmit(event)
      }}
    >
      <Field label={ACCOUNT_COPY.email} error={errors.email?.message}>
        {(control) => <Input {...control} {...field('email')} type="email" autoComplete="email" />}
      </Field>
      <FormError message={errors.root?.server?.message} />
      <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
        {isSubmitting ? ACCOUNT_COPY.submitting : ACCOUNT_COPY.forgot.submit}
      </Button>
      <Link
        href={asRoute(LOGIN_PATH)}
        className="text-accent self-start text-[13px] underline-offset-4 hover:underline"
      >
        {ACCOUNT_COPY.forgot.back}
      </Link>
    </form>
  )
}
