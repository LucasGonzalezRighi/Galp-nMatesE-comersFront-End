'use client'

import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Button, Field, Input } from '@/components/ui'
import { asRoute } from '@/lib/routes'
import { isApiError, login } from '@galpon/api-client'
import { useApiClient } from '@galpon/api-client/react'
import { loginSchema } from '@galpon/schemas'
import { ACCOUNT_COPY } from './account.copy'
import { resetAccountState, withCsrf } from './csrf'
import { showSubmitError } from './form-errors'
import { FORM_CARD, FormError } from './form-parts'
import { safeReturnPath } from './return-path'

/** Campos que la API puede marcar con error. */
const FIELDS = ['email', 'password'] as const

/**
 * Formulario de `/cuenta/ingresar`: email y contraseña (`loginSchema`, con los errores al salir
 * de cada campo y al enviar). Pide el token CSRF, inicia la sesión, olvida los datos de la sesión
 * anterior y vuelve a la página de `volver` (solo rutas internas; por omisión `/cuenta`). Con
 * credenciales incorrectas (`401`) avisa "Email o contraseña incorrectos." sin decir cuál falló.
 *
 * Lee `volver` con `useSearchParams`: va dentro de un `<Suspense>`.
 */
export function LoginForm(): ReactNode {
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
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await withCsrf(queryClient, api, () => login(api, values))
    } catch (error) {
      if (isApiError(error) && error.kind === 'unauthorized') {
        setError('root.server', { message: ACCOUNT_COPY.login.invalidCredentials })
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
      <Field label={ACCOUNT_COPY.email} error={errors.email?.message}>
        {(control) => <Input {...control} {...field('email')} type="email" autoComplete="email" />}
      </Field>
      <Field label={ACCOUNT_COPY.password} error={errors.password?.message}>
        {(control) => (
          <Input
            {...control}
            {...field('password')}
            type="password"
            autoComplete="current-password"
          />
        )}
      </Field>
      <Link
        href={asRoute('/cuenta/recuperar')}
        className="text-accent self-start text-[13px] underline-offset-4 hover:underline"
      >
        {ACCOUNT_COPY.login.forgot}
      </Link>
      <FormError message={errors.root?.server?.message} />
      <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
        {isSubmitting ? ACCOUNT_COPY.submitting : ACCOUNT_COPY.login.submit}
      </Button>
      <p className="m-0 text-[13px] text-neutral-400">
        {ACCOUNT_COPY.login.noAccount}{' '}
        <Link href={asRoute(`/cuenta/registro${keepReturn}`)} className="text-accent underline">
          {ACCOUNT_COPY.login.register}
        </Link>
      </p>
    </form>
  )
}
