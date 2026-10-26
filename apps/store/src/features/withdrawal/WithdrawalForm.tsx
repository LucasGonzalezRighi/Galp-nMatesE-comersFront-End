'use client'

import type { ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { WithdrawalReceipt, WithdrawalSubmission } from '@galpon/api-client'
import { DrawCheck } from '@/components/motion'
import { Button, Field, Input, Textarea } from '@/components/ui'
import { asRoute } from '@/lib/routes'
import { requestWithdrawal } from '@galpon/api-client'
import { useApiClient } from '@galpon/api-client/react'
import { toFieldErrors, withdrawalSchema } from '@galpon/schemas'
import { describeSubmitError } from './submit-error'
import { useRemountKey } from './use-remount-key'
import { WITHDRAWAL_COPY } from './withdrawal.copy'

/** Props de {@link WithdrawalForm}. */
export interface WithdrawalFormProps {
  /**
   * Contenido que va arriba de los campos, dentro de la tarjeta, mientras no se envió la
   * solicitud (por ejemplo, el selector de motivo de Contacto).
   */
  leading?: ReactNode
}

/** Lo que escribe la persona. */
interface Values {
  name: string
  email: string
  orderNumber: string
  comment: string
  /** Campo trampa contra bots: las personas no lo ven ni lo completan. */
  website: string
}

/** Formulario vacío. */
const EMPTY: Values = { name: '', email: '', orderNumber: '', comment: '', website: '' }

/** Campos del formulario que la API puede marcar con error. */
const FIELDS = ['name', 'email', 'orderNumber', 'comment'] as const

/** Tarjeta del formulario (`--color-surface`, radio `lg`, borde fino). */
const CARD = 'bg-surface flex flex-col gap-4 rounded-lg p-[clamp(20px,3vw,32px)] shadow-sm'

/** Tarjeta de la confirmación: el mismo fondo con el borde cobre. */
const RECEIPT_CARD =
  'bg-surface flex flex-col items-start gap-[18px] rounded-lg p-[clamp(24px,3vw,36px)] shadow-[0_0_0_1px_var(--color-accent-700)]'

/** Campo trampa: fuera de la pantalla y del orden de tabulación. */
const HONEYPOT = 'absolute -left-[9999px] h-0 w-0 overflow-hidden'

/** El formulario y su confirmación, con el estado propio (se reinicia cambiándole la `key`). */
function WithdrawalFormBody({ leading }: WithdrawalFormProps): ReactNode {
  const api = useApiClient()
  const [values, setValues] = useState<Values>(EMPTY)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<WithdrawalReceipt | null>(null)
  const receiptTitle = useRef<HTMLHeadingElement>(null)
  const mutation = useMutation({
    mutationFn: (input: WithdrawalSubmission) => requestWithdrawal(api, input),
  })

  useEffect(() => {
    // El formulario desaparece al confirmar: el foco pasa a la confirmación.
    if (receipt !== null) receiptTitle.current?.focus()
  }, [receipt])

  const update = (field: keyof Values, value: string): void => {
    setValues((current) => ({ ...current, [field]: value }))
  }

  const submit = (): void => {
    const parsed = withdrawalSchema.safeParse({ ...values, website: undefined })
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error))
      setFormError(null)
      return
    }
    setFieldErrors({})
    setFormError(null)
    mutation.mutate(
      {
        name: parsed.data.name,
        email: parsed.data.email,
        orderNumber: parsed.data.orderNumber ?? null,
        comment: parsed.data.comment ?? null,
        website: values.website,
      },
      {
        onSuccess: (result) => {
          setReceipt(result)
        },
        onError: (error) => {
          const failure = describeSubmitError(error, FIELDS, {
            network: WITHDRAWAL_COPY.networkError,
            unexpected: WITHDRAWAL_COPY.unexpectedError,
          })
          setFieldErrors(failure.fieldErrors)
          setFormError(failure.message)
        },
      },
    )
  }

  if (receipt !== null) {
    return (
      <div className={RECEIPT_CARD}>
        <DrawCheck size={56} />
        <h2
          ref={receiptTitle}
          tabIndex={-1}
          className="text-[26px] tracking-[-0.02em] outline-none"
        >
          {WITHDRAWAL_COPY.receiptTitle}
        </h2>
        <p className="m-0 text-[15px] leading-[1.65] text-neutral-300">
          {WITHDRAWAL_COPY.receiptText}
        </p>
        <p className="m-0 flex flex-col gap-1">
          <span className="text-[11px] tracking-[0.12em] text-neutral-500 uppercase">
            {WITHDRAWAL_COPY.receiptCode}
          </span>
          <strong className="text-accent-300 text-[28px] font-medium tracking-[0.02em] tabular-nums">
            {receipt.code}
          </strong>
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            mutation.reset()
            setValues(EMPTY)
            setReceipt(null)
          }}
        >
          {WITHDRAWAL_COPY.another}
        </Button>
      </div>
    )
  }

  return (
    <form
      noValidate
      aria-busy={mutation.isPending}
      className={CARD}
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      {leading}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-4">
        <Field label={WITHDRAWAL_COPY.name} error={fieldErrors.name}>
          {(control) => (
            <Input
              {...control}
              name="name"
              autoComplete="name"
              value={values.name}
              onChange={(event) => {
                update('name', event.target.value)
              }}
            />
          )}
        </Field>
        <Field label={WITHDRAWAL_COPY.email} error={fieldErrors.email}>
          {(control) => (
            <Input
              {...control}
              type="email"
              name="email"
              autoComplete="email"
              value={values.email}
              onChange={(event) => {
                update('email', event.target.value)
              }}
            />
          )}
        </Field>
      </div>
      <Field label={WITHDRAWAL_COPY.orderNumber} error={fieldErrors.orderNumber}>
        {(control) => (
          <Input
            {...control}
            name="orderNumber"
            autoComplete="off"
            placeholder={WITHDRAWAL_COPY.orderNumberPlaceholder}
            value={values.orderNumber}
            onChange={(event) => {
              update('orderNumber', event.target.value)
            }}
          />
        )}
      </Field>
      <Field label={WITHDRAWAL_COPY.comment} error={fieldErrors.comment}>
        {(control) => (
          <Textarea
            {...control}
            name="comment"
            rows={4}
            placeholder={WITHDRAWAL_COPY.commentPlaceholder}
            className="min-h-[130px]"
            value={values.comment}
            onChange={(event) => {
              update('comment', event.target.value)
            }}
          />
        )}
      </Field>
      <div className={HONEYPOT} aria-hidden="true">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(event) => {
            update('website', event.target.value)
          }}
        />
      </div>
      <p className="m-0 text-[12px] text-neutral-400">
        {WITHDRAWAL_COPY.privacyBefore}{' '}
        <Link href={asRoute('/privacidad')} className="text-accent underline">
          {WITHDRAWAL_COPY.privacyLink}
        </Link>
        .
      </p>
      {formError === null ? null : (
        <p role="alert" className="text-danger m-0 text-[13px]">
          {formError}
        </p>
      )}
      <Button type="submit" size="lg" fullWidth loading={mutation.isPending}>
        {mutation.isPending ? WITHDRAWAL_COPY.submitting : WITHDRAWAL_COPY.submit}
      </Button>
    </form>
  )
}

/**
 * Formulario del botón de arrepentimiento (spec 9.6, Disposición 954/2025): nombre y email usado
 * en la compra, y de forma opcional el número de pedido y un comentario. No exige registro. Al
 * enviar muestra el código de identificación del trámite que devuelve la API.
 *
 * Los campos se validan con `withdrawalSchema`; los errores del servidor (422) se muestran por
 * campo y un error de red como "No pudimos conectar, probá de nuevo". Cuando la página se oculta
 * (Cache Components) el formulario se reinicia, así no vuelve a aparecer con la confirmación.
 *
 * Tiene que estar dentro de un `ApiClientProvider` y de un `QueryClientProvider`.
 *
 * @param props - Ver {@link WithdrawalFormProps}.
 */
export function WithdrawalForm(props: WithdrawalFormProps): ReactNode {
  const resetKey = useRemountKey()
  return <WithdrawalFormBody key={resetKey} {...props} />
}
