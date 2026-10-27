'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { Customer } from '@galpon/api-client'
import { asRoute } from '@/lib/routes'
import { checkoutContactSchema, toFieldErrors } from '@galpon/schemas'
import type { ContactValues } from './checkout.store'
import { CHECKOUT_COPY } from './checkout.copy'
import { TextField } from './CheckoutFields'
import { StepActions } from './StepActions'
import { useStepForm } from './use-step-form'

/** Campos del paso, en el orden del formulario. */
const FIELDS = ['email', 'firstName', 'lastName', 'phone'] as const

/** Contacto vacío. */
const EMPTY: ContactValues = { email: '', firstName: '', lastName: '', phone: '' }

/** Props de {@link ContactStep}. */
export interface ContactStepProps {
  /** Contacto guardado del paso, o `null` si todavía no se completó. */
  saved: ContactValues | null
  /** Cliente con la sesión iniciada, para completar el paso solo; `null` sin sesión. */
  customer: Customer | null
  /** Recibe el contacto válido al tocar "Continuar". */
  onSubmit: (contact: ContactValues) => void
}

/**
 * Paso 1, Contacto (spec 14.1): email, nombre, apellido y teléfono opcional, validados con
 * `checkoutContactSchema`. Con sesión se completan solos y se pueden editar.
 *
 * @param props - Ver {@link ContactStepProps}.
 */
export function ContactStep({ saved, customer, onSubmit }: ContactStepProps): ReactNode {
  const [edited, setEdited] = useState<ContactValues | null>(saved)
  // Hasta que la persona escribe algo, se muestran los datos de la sesión (llegan después).
  const values = useMemo<ContactValues>(
    () =>
      edited ??
      (customer === null
        ? EMPTY
        : {
            email: customer.email,
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: customer.phone ?? '',
          }),
    [edited, customer],
  )
  const errors = useMemo(() => {
    const parsed = checkoutContactSchema.safeParse(values)
    return parsed.success ? {} : toFieldErrors(parsed.error)
  }, [values])
  const form = useStepForm(FIELDS, errors)
  const field = (name: (typeof FIELDS)[number]) => ({
    form,
    name,
    value: values[name],
    onChange: (value: string) => {
      setEdited({ ...values, [name]: value })
    },
  })

  return (
    <form
      noValidate
      aria-label={CHECKOUT_COPY.steps[0]}
      className="flex flex-col gap-7"
      onSubmit={(event) => {
        event.preventDefault()
        if (form.check()) onSubmit(values)
      }}
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-4">
        <TextField
          {...field('email')}
          label={CHECKOUT_COPY.email}
          type="email"
          autoComplete="email"
          placeholder={CHECKOUT_COPY.emailPlaceholder}
          className="col-span-full"
        />
        <TextField
          {...field('firstName')}
          label={CHECKOUT_COPY.firstName}
          autoComplete="given-name"
        />
        <TextField
          {...field('lastName')}
          label={CHECKOUT_COPY.lastName}
          autoComplete="family-name"
        />
        <TextField
          {...field('phone')}
          label={CHECKOUT_COPY.phone}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={CHECKOUT_COPY.phonePlaceholder}
          className="col-span-full"
        />
        <p className="col-span-full m-0 text-[12.5px] text-neutral-500">
          {CHECKOUT_COPY.contactNote}{' '}
          <span>
            {CHECKOUT_COPY.privacyBefore}{' '}
            <Link href={asRoute('/privacidad')} className="text-accent underline">
              {CHECKOUT_COPY.privacyLink}
            </Link>
            .
          </span>
        </p>
      </div>
      <StepActions />
    </form>
  )
}
