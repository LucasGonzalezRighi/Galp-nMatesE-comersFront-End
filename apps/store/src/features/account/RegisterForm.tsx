'use client'

import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Button, Field, Input } from '@/components/ui'
import { asRoute } from '@/lib/routes'
import { isApiError, register } from '@galpon/api-client'
import { useApiClient } from '@galpon/api-client/react'
import { registerSchema } from '@galpon/schemas'
import { ACCOUNT_COPY } from './account.copy'
import { resetAccountState, withCsrf } from './csrf'
import { showSubmitError } from './form-errors'
import { FORM_CARD, FormError } from './form-parts'
import { safeReturnPath } from './return-path'

/** Campos que la API puede marcar con error. */
const FIELDS = ['firstName', 'lastName', 'email', 'password'] as const

/**
 * Formulario de `/cuenta/registro`: nombre, apellido, email y contraseña (`registerSchema`). Crea
 * la cuenta con el token CSRF, que además inicia la sesión, y va a `volver` (por omisión
 * `/cuenta`). Si el email ya tiene cuenta (`409`), lo marca en el campo con los accesos para
 * ingresar o recuperar la contraseña.
 *
 * Lee `volver` con `useSearchParams`: va dentro de un `<Suspense>`.
 */
export function RegisterForm(): ReactNode {
  const api = useApiClient()
  const queryClient = useQueryClient()
  const router = useRouter()
  const volver = useSearchParams().get('volver')
  const returnPath = safeReturnPath(volver)
  const {
    register: field,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await withCsrf(queryClient, api, () => register(api, values))
    } catch (error) {
      if (isApiError(error) && error.kind === 'conflict') {
        setError('email', { message: ACCOUNT_COPY.register.emailTaken }, { shouldFocus: true })
      } else {
        showSubmitError(error, FIELDS, setError)
      }
      return
    }
    await resetAccountState(queryClient)
    router.replace(asRoute(returnPath))
  })

  const keepReturn = volver === null ? '' : `?volver=${encodeURIComponent(returnPath)}`

  return (
    <form
      noValidate
      aria-busy={isSubmitting}
      className={FORM_CARD}
      onSubmit={(event) => {
        void onSubmit(event)
      }}
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-4">
        <Field label={ACCOUNT_COPY.firstName} error={errors.firstName?.message}>
          {(control) => <Input {...control} {...field('firstName')} autoComplete="given-name" />}
        </Field>
        <Field label={ACCOUNT_COPY.lastName} error={errors.lastName?.message}>
          {(control) => <Input {...control} {...field('lastName')} autoComplete="family-name" />}
        </Field>
      </div>
      <Field label={ACCOUNT_COPY.email} error={errors.email?.message}>
        {(control) => <Input {...control} {...field('email')} type="email" autoComplete="email" />}
      </Field>
      <Field
        label={ACCOUNT_COPY.password}
        hint={ACCOUNT_COPY.passwordHint}
        error={errors.password?.message}
      >
        {(control) => (
          <Input {...control} {...field('password')} type="password" autoComplete="new-password" />
        )}
      </Field>
      <FormError message={errors.root?.server?.message} />
      <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
        {isSubmitting ? ACCOUNT_COPY.submitting : ACCOUNT_COPY.register.submit}
      </Button>
      <p className="m-0 text-[13px] text-neutral-400">
        {ACCOUNT_COPY.register.haveAccount}{' '}
        <Link href={asRoute(`/cuenta/ingresar${keepReturn}`)} className="text-accent underline">
          {ACCOUNT_COPY.register.login}
        </Link>
      </p>
    </form>
  )
}
