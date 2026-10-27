'use client'

import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { Address, Customer, OrderSummaryPage } from '@galpon/api-client'
import { Button, Field, Input, Tag } from '@/components/ui'
import { asRoute } from '@/lib/routes'
import { updateMe } from '@galpon/api-client'
import { meQuery, queryKeys, useApiClient } from '@galpon/api-client/react'
import { formatDate, formatPesos, pesos } from '@galpon/domain'
import { checkoutContactSchema } from '@galpon/schemas'
import { ACCOUNT_COPY, ORDER_STATUS_LABELS } from './account.copy'
import { withCsrf } from './csrf'
import { showSubmitError } from './form-errors'
import { FORM_CARD, FormError, PrivacyNotice } from './form-parts'
import { formatAddressLines } from './format-address'

/** Datos editables del perfil: los del contacto del checkout, sin el email (identifica la cuenta). */
const profileSchema = checkoutContactSchema.omit({ email: true })

/** Campos que la API puede marcar con error. */
const FIELDS = ['firstName', 'lastName', 'phone'] as const

/** Tarjeta de cada bloque del resumen. */
const CARD =
  'bg-surface flex flex-col items-start gap-2 rounded-lg p-[clamp(18px,2.4vw,26px)] shadow-sm'

/** Título de cada bloque. */
const CARD_TITLE = 'text-[12px] tracking-[0.12em] text-neutral-500 uppercase'

const COPY = ACCOUNT_COPY.overview

/** Props de {@link ProfileForm}. */
interface ProfileFormProps {
  /** Datos actuales del cliente. */
  customer: Customer
}

/** "Tus datos": nombre, apellido y teléfono, con el email a la vista pero sin editar. */
function ProfileForm({ customer }: ProfileFormProps): ReactNode {
  const api = useApiClient()
  const queryClient = useQueryClient()
  const titleId = useId()
  const [saved, setSaved] = useState(false)
  const {
    register: field,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    mode: 'onTouched',
    defaultValues: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone ?? '',
    },
  })

  const onSubmit = handleSubmit(async ({ firstName, lastName, phone }) => {
    setSaved(false)
    try {
      const updated = await withCsrf(queryClient, api, () =>
        updateMe(api, { firstName, lastName, phone: phone ?? null }),
      )
      queryClient.setQueryData(queryKeys.me(), updated)
      setSaved(true)
    } catch (error) {
      showSubmitError(error, FIELDS, setError)
    }
  })

  return (
    <form
      noValidate
      aria-busy={isSubmitting}
      aria-labelledby={titleId}
      className={FORM_CARD}
      onSubmit={(event) => {
        void onSubmit(event)
      }}
    >
      <h2 id={titleId} className={CARD_TITLE}>
        {COPY.profileTitle}
      </h2>
      <p className="m-0 text-[14px] text-neutral-300">
        {ACCOUNT_COPY.email}: {customer.email}
      </p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-4">
        <Field label={ACCOUNT_COPY.firstName} error={errors.firstName?.message}>
          {(control) => <Input {...control} {...field('firstName')} autoComplete="given-name" />}
        </Field>
        <Field label={ACCOUNT_COPY.lastName} error={errors.lastName?.message}>
          {(control) => <Input {...control} {...field('lastName')} autoComplete="family-name" />}
        </Field>
      </div>
      <Field label={ACCOUNT_COPY.phone} hint={ACCOUNT_COPY.phoneHint} error={errors.phone?.message}>
        {(control) => <Input {...control} {...field('phone')} type="tel" autoComplete="tel" />}
      </Field>
      <PrivacyNotice />
      <FormError message={errors.root?.server?.message} />
      <p role="status" className="m-0 text-[13px] text-neutral-300">
        {saved ? COPY.profileSaved : null}
      </p>
      <Button type="submit" loading={isSubmitting} className="self-start">
        {isSubmitting ? ACCOUNT_COPY.submitting : COPY.profileSubmit}
      </Button>
    </form>
  )
}

/** Props de {@link AccountOverview}. */
export interface AccountOverviewProps {
  /** Datos del cliente, leídos en el servidor con su sesión. */
  customer: Customer
  /** Primera página de sus pedidos (el más nuevo primero). */
  orders: OrderSummaryPage
  /** Su libreta de direcciones (la predeterminada primero). */
  addresses: Address[]
}

/**
 * Página `/cuenta`: saludo, el último pedido, la dirección predeterminada (o los estados vacíos
 * "Todavía no hiciste pedidos" / "No tenés direcciones guardadas") y el formulario de datos.
 * Al guardar los datos se actualiza la sesión, así el encabezado muestra el nombre nuevo.
 *
 * @param props - Ver {@link AccountOverviewProps}.
 */
export function AccountOverview({ customer, orders, addresses }: AccountOverviewProps): ReactNode {
  const api = useApiClient()
  const { data: current } = useQuery({ ...meQuery(api), initialData: customer })
  const lastOrder = orders.items[0]
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0]

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-[clamp(32px,4vw,52px)] leading-none tracking-[-0.03em]">
          {COPY.greeting} {current.firstName}
        </h1>
        <p className="m-0 text-[15px] text-neutral-300">{COPY.intro}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={CARD}>
          <h2 className={CARD_TITLE}>{COPY.lastOrder}</h2>
          {lastOrder === undefined ? (
            <p className="m-0 text-[15px]">{COPY.noOrders}</p>
          ) : (
            <>
              <Link
                href={asRoute(`/cuenta/pedidos/${lastOrder.number}`)}
                className="text-[16px] tabular-nums underline-offset-4 hover:underline"
              >
                {lastOrder.number}
              </Link>
              <p className="m-0 text-[13px] text-neutral-400">
                {formatDate(lastOrder.createdAt)} · {formatPesos(pesos(lastOrder.totalArs))}
              </p>
              <Tag variant="outline">{ORDER_STATUS_LABELS[lastOrder.status]}</Tag>
            </>
          )}
          <Link
            href={asRoute(lastOrder === undefined ? '/tienda' : '/cuenta/pedidos')}
            className="text-accent mt-auto text-[13px] underline-offset-4 hover:underline"
          >
            {lastOrder === undefined ? ACCOUNT_COPY.orders.shop : COPY.allOrders}
          </Link>
        </div>
        <div className={CARD}>
          <h2 className={CARD_TITLE}>{COPY.defaultAddress}</h2>
          {defaultAddress === undefined ? (
            <p className="m-0 text-[15px]">{COPY.noAddresses}</p>
          ) : (
            formatAddressLines(defaultAddress).map((line) => (
              <p key={line} className="m-0 text-[14px] text-neutral-300">
                {line}
              </p>
            ))
          )}
          <Link
            href={asRoute('/cuenta/direcciones')}
            className="text-accent mt-auto text-[13px] underline-offset-4 hover:underline"
          >
            {COPY.manageAddresses}
          </Link>
        </div>
      </div>
      <ProfileForm customer={current} />
    </section>
  )
}
