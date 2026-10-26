'use client'

import type { ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import type { ContactSubmission } from '@galpon/api-client'
import type { ContactReason } from '@galpon/schemas'
import { DrawCheck } from '@/components/motion'
import { Button, Field, Input, Textarea } from '@/components/ui'
import { sendContactMessage } from '@galpon/api-client'
import { useApiClient } from '@galpon/api-client/react'
import { contactSchema, toFieldErrors } from '@galpon/schemas'
import { CONTACT_COPY } from './contact.copy'
import { describeSubmitError } from './submit-error'
import { useRemountKey } from './use-remount-key'

/** Props de {@link ContactForm}. */
export interface ContactFormProps {
  /** Motivo elegido en el selector. */
  reason: ContactReason
  /** El selector de motivo, que se muestra entre el número de pedido y el mensaje. */
  reasonField: ReactNode
}

/** Lo que escribe la persona. */
interface Values {
  name: string
  email: string
  orderNumber: string
  message: string
  /** Campo trampa contra bots: las personas no lo ven ni lo completan. */
  website: string
}

/** A quién se le agradece en la confirmación. */
interface Sender {
  name: string
  email: string
}

/** Formulario vacío. */
const EMPTY: Values = { name: '', email: '', orderNumber: '', message: '', website: '' }

/** Campos del formulario que la API puede marcar con error. */
const FIELDS = ['name', 'email', 'orderNumber', 'reason', 'message'] as const

/** Tarjeta del formulario (`--color-surface`, radio `lg`, borde fino). */
const CARD = 'bg-surface flex flex-col gap-4 rounded-lg p-[clamp(20px,3vw,32px)] shadow-sm'

/** Tarjeta de la confirmación: el mismo fondo con el borde cobre. */
const SENT_CARD =
  'bg-surface flex flex-col items-start gap-[18px] rounded-lg p-[clamp(24px,3vw,36px)] shadow-[0_0_0_1px_var(--color-accent-700)]'

/** Campo trampa: fuera de la pantalla y del orden de tabulación. */
const HONEYPOT = 'absolute -left-[9999px] h-0 w-0 overflow-hidden'

/** El formulario y su confirmación, con el estado propio (se reinicia cambiándole la `key`). */
function ContactFormBody({ reason, reasonField }: ContactFormProps): ReactNode {
  const api = useApiClient()
  const [values, setValues] = useState<Values>(EMPTY)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [sender, setSender] = useState<Sender | null>(null)
  const sentTitle = useRef<HTMLHeadingElement>(null)
  const mutation = useMutation({
    mutationFn: (input: ContactSubmission) => sendContactMessage(api, input),
  })

  useEffect(() => {
    // El formulario desaparece al confirmar: el foco pasa a la confirmación.
    if (sender !== null) sentTitle.current?.focus()
  }, [sender])

  const update = (field: keyof Values, value: string): void => {
    setValues((current) => ({ ...current, [field]: value }))
  }

  const submit = (): void => {
    const parsed = contactSchema.safeParse({ ...values, reason, website: undefined })
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error))
      setFormError(null)
      return
    }
    setFieldErrors({})
    setFormError(null)
    const { name, email } = parsed.data
    mutation.mutate(
      {
        name,
        email,
        orderNumber: parsed.data.orderNumber ?? null,
        reason: parsed.data.reason,
        message: parsed.data.message,
        website: values.website,
      },
      {
        onSuccess: () => {
          setSender({ name, email })
        },
        onError: (error) => {
          const failure = describeSubmitError(error, FIELDS, {
            network: CONTACT_COPY.networkError,
            unexpected: CONTACT_COPY.unexpectedError,
          })
          setFieldErrors(failure.fieldErrors)
          setFormError(failure.message)
        },
      },
    )
  }

  if (sender !== null) {
    return (
      <div className={SENT_CARD}>
        <DrawCheck size={56} />
        <h2 ref={sentTitle} tabIndex={-1} className="text-[26px] tracking-[-0.02em] outline-none">
          {CONTACT_COPY.sentTitle}
        </h2>
        <p className="m-0 text-[15px] leading-[1.65] text-neutral-300">
          {CONTACT_COPY.sentText(sender.name, sender.email)}
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            mutation.reset()
            setValues(EMPTY)
            setSender(null)
          }}
        >
          {CONTACT_COPY.another}
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
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-4">
        <Field label={CONTACT_COPY.name} error={fieldErrors.name}>
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
        <Field label={CONTACT_COPY.email} error={fieldErrors.email}>
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
      <Field label={CONTACT_COPY.orderNumber} error={fieldErrors.orderNumber}>
        {(control) => (
          <Input
            {...control}
            name="orderNumber"
            autoComplete="off"
            placeholder={CONTACT_COPY.orderNumberPlaceholder}
            value={values.orderNumber}
            onChange={(event) => {
              update('orderNumber', event.target.value)
            }}
          />
        )}
      </Field>
      {reasonField}
      {fieldErrors.reason === undefined ? null : (
        <p role="alert" className="text-danger m-0 text-[12px]">
          {fieldErrors.reason}
        </p>
      )}
      <Field label={CONTACT_COPY.message} error={fieldErrors.message}>
        {(control) => (
          <Textarea
            {...control}
            name="message"
            rows={5}
            placeholder={CONTACT_COPY.messagePlaceholder}
            className="min-h-[130px]"
            value={values.message}
            onChange={(event) => {
              update('message', event.target.value)
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
      {formError === null ? null : (
        <p role="alert" className="text-danger m-0 text-[13px]">
          {formError}
        </p>
      )}
      <Button type="submit" size="lg" fullWidth loading={mutation.isPending}>
        {mutation.isPending ? CONTACT_COPY.submitting : CONTACT_COPY.submit}
      </Button>
    </form>
  )
}

/**
 * Formulario de contacto (spec 9.5): nombre, email, número de pedido opcional, motivo y mensaje,
 * con un campo trampa contra bots. Se valida con `contactSchema`; los errores del servidor (422)
 * se muestran por campo y un error de red como "No pudimos conectar, probá de nuevo". Al enviar
 * muestra "Mensaje enviado" con un botón para escribir otro. Cuando la página se oculta (Cache
 * Components) el formulario se reinicia.
 *
 * Tiene que estar dentro de un `ApiClientProvider` y de un `QueryClientProvider`.
 *
 * @param props - Ver {@link ContactFormProps}.
 */
export function ContactForm(props: ContactFormProps): ReactNode {
  const resetKey = useRemountKey()
  return <ContactFormBody key={resetKey} {...props} />
}
