'use client'

import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button, Dialog, Field, Input } from '@/components/ui'
import { deleteMe } from '@galpon/api-client'
import { useApiClient } from '@galpon/api-client/react'
import { deleteAccountSchema } from '@galpon/schemas'
import { showToast } from '../toast'
import { ACCOUNT_COPY } from './account.copy'
import { resetAccountState, withCsrf } from './csrf'
import { showSubmitError } from './form-errors'
import { FormError } from './form-parts'

/** Campos que la API puede marcar con error. */
const FIELDS = ['password'] as const

const COPY = ACCOUNT_COPY.deleteAccount

/**
 * "Eliminar mi cuenta" (LA-6, LS-5), al final de `/cuenta`: explica qué se borra y qué se
 * conserva, y un botón abre un diálogo que pide la contraseña actual. Con la contraseña correcta
 * la API borra la cuenta y la sesión (`DELETE /me`); la tienda olvida los datos de la cuenta,
 * avisa "Eliminamos tu cuenta" y vuelve al inicio. Con la contraseña equivocada (`422`) el
 * mensaje queda bajo el campo y el diálogo sigue abierto.
 */
export function DeleteAccount(): ReactNode {
  const api = useApiClient()
  const queryClient = useQueryClient()
  const router = useRouter()
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const {
    register: field,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { password: '' },
  })

  const close = (): void => {
    if (isSubmitting) return
    setOpen(false)
    reset()
  }

  const onSubmit = handleSubmit(async ({ password }) => {
    try {
      await withCsrf(queryClient, api, () => deleteMe(api, { password }))
    } catch (error) {
      showSubmitError(error, FIELDS, setError)
      return
    }
    await resetAccountState(queryClient)
    showToast({ title: COPY.done })
    router.replace('/')
  })

  return (
    <section
      aria-labelledby={titleId}
      className="bg-surface flex flex-col items-start gap-3 rounded-lg p-[clamp(18px,2.4vw,26px)] shadow-sm"
    >
      <h2 id={titleId} className="text-[12px] tracking-[0.12em] text-neutral-500 uppercase">
        {COPY.title}
      </h2>
      <p className="m-0 max-w-[640px] text-[14px] leading-[1.6] text-neutral-300">{COPY.text}</p>
      <Button
        type="button"
        variant="secondary"
        className="min-h-[36px]"
        onClick={() => {
          setOpen(true)
        }}
      >
        {COPY.open}
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={COPY.dialogTitle}
        description={COPY.dialogText}
        className="w-[min(440px,calc(100vw-32px))]"
      >
        <form
          noValidate
          aria-busy={isSubmitting}
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            void onSubmit(event)
          }}
        >
          <Field label={COPY.password} error={errors.password?.message}>
            {(control) => (
              <Input
                {...control}
                {...field('password')}
                type="password"
                autoComplete="current-password"
              />
            )}
          </Field>
          <FormError message={errors.root?.server?.message} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={isSubmitting}>
              {isSubmitting ? COPY.deleting : COPY.confirm}
            </Button>
            <Button type="button" variant="secondary" disabled={isSubmitting} onClick={close}>
              {COPY.cancel}
            </Button>
          </div>
        </form>
      </Dialog>
    </section>
  )
}
