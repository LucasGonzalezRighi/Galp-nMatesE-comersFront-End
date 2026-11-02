'use client'

import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import type { Address, ShippingOption } from '@galpon/api-client'
import type { AddressField, ShippingMethod } from '@galpon/domain'
import { Button, Field, Select } from '@/components/ui'
import { ADDRESS_FIELDS_BY_METHOD, formatPesos, pesos, PROVINCES } from '@galpon/domain'
import { shippingSchema, toFieldErrors } from '@galpon/schemas'
import type { AddressValues, ShippingValues } from './checkout.store'
import { CHECKOUT_COPY, pickupNote } from './checkout.copy'
import { SelectField, TextField } from './CheckoutFields'
import { OptionCard } from './OptionCard'
import { StepActions } from './StepActions'
import { useStepForm } from './use-step-form'

/** Todos los campos de dirección, en el orden del formulario a domicilio. */
const ALL_FIELDS = ADDRESS_FIELDS_BY_METHOD.home

/** Dirección vacía. */
const EMPTY_ADDRESS: AddressValues = {
  street: '',
  number: '',
  apartment: '',
  postalCode: '',
  city: '',
  province: '',
}

/** Etiqueta, texto de ejemplo y autocompletado de un campo de dirección. */
interface AddressInputCopy {
  /** Etiqueta visible. */
  label: string
  /** Texto de ejemplo. */
  placeholder?: string
  /** Autocompletado del navegador. */
  autoComplete: string
}

/** Etiqueta, texto de ejemplo y autocompletado de cada campo de dirección. */
const ADDRESS_INPUTS: Readonly<Record<AddressField, AddressInputCopy>> = {
  street: { label: CHECKOUT_COPY.street, autoComplete: 'address-line1' },
  number: { label: CHECKOUT_COPY.number, autoComplete: 'off' },
  apartment: { label: CHECKOUT_COPY.apartment, autoComplete: 'address-line2' },
  postalCode: {
    label: CHECKOUT_COPY.postalCode,
    placeholder: CHECKOUT_COPY.postalCodePlaceholder,
    autoComplete: 'postal-code',
  },
  city: { label: CHECKOUT_COPY.city, autoComplete: 'address-level2' },
  province: { label: CHECKOUT_COPY.province, autoComplete: 'address-level1' },
}

/** Props de {@link ShippingStep}. */
export interface ShippingStepProps {
  /** Envío guardado del paso, o `null` si todavía no se completó. */
  saved: ShippingValues | null
  /** Opciones de envío habilitadas (de los ajustes públicos), en el orden del admin. */
  options: readonly ShippingOption[]
  /** Email del paso 1, para el texto del retiro. */
  email: string
  /** Direcciones guardadas del cliente con sesión; vacío sin sesión. */
  addresses: readonly Address[]
  /** Avisa el método elegido, para que el resumen muestre su costo. */
  onMethodChange: (method: ShippingMethod) => void
  /** Vuelve al paso 1. */
  onBack: () => void
  /** Recibe el envío válido al tocar "Continuar". */
  onSubmit: (shipping: ShippingValues) => void
}

/** Costo de una opción como lo muestra el diseño: "Gratis" o "$6.500". */
function costLabel(costArs: number): string {
  return costArs === 0 ? CHECKOUT_COPY.free : formatPesos(pesos(costArs))
}

/** Texto de una dirección guardada en el selector. */
function addressLabel(address: Address): string {
  const place = `${address.street} ${address.number}, ${address.city}`
  return address.label === null ? place : `${address.label} · ${place}`
}

/**
 * Paso 2, Envío (spec 14.1): opciones con plazo y costo fijo, y los campos de dirección que pide
 * el método (`ADDRESS_FIELDS_BY_METHOD`), validados con `shippingSchema`. Con sesión se puede
 * elegir una dirección guardada. El retiro no pide dirección.
 *
 * @param props - Ver {@link ShippingStepProps}.
 */
export function ShippingStep({
  saved,
  options,
  email,
  addresses,
  onMethodChange,
  onBack,
  onSubmit,
}: ShippingStepProps): ReactNode {
  const first = options[0]
  const [values, setValues] = useState<ShippingValues | null>(() => {
    if (saved !== null && options.some((option) => option.method === saved.method)) return saved
    return first === undefined ? null : { method: first.method, address: EMPTY_ADDRESS }
  })
  const errors = useMemo(() => {
    if (values === null) return {}
    const parsed = shippingSchema.safeParse(values)
    if (parsed.success) return {}
    const byField: Partial<Record<AddressField, string>> = {}
    for (const [path, message] of Object.entries(toFieldErrors(parsed.error))) {
      const field = ALL_FIELDS.find((candidate) => path === `address.${candidate}`)
      if (field !== undefined) byField[field] = message
    }
    return byField
  }, [values])
  const fields = values === null ? [] : ADDRESS_FIELDS_BY_METHOD[values.method]
  const form = useStepForm(ALL_FIELDS, errors)

  if (values === null) {
    return (
      <div className="flex flex-col gap-7">
        <p className="m-0 text-[14px] text-neutral-300">{CHECKOUT_COPY.noShippingOptions}</p>
        <Button variant="secondary" size="lg" className="self-start" onClick={onBack}>
          {CHECKOUT_COPY.back}
        </Button>
      </div>
    )
  }

  const setAddress = (address: Partial<AddressValues>): void => {
    setValues({ ...values, address: { ...values.address, ...address } })
  }

  return (
    <form
      noValidate
      aria-label={CHECKOUT_COPY.steps[1]}
      className="flex flex-col gap-7"
      onSubmit={(event) => {
        event.preventDefault()
        if (form.check()) onSubmit(values)
      }}
    >
      <fieldset className="m-0 flex flex-col gap-[10px] border-0 p-0">
        <legend className="sr-only">{CHECKOUT_COPY.shippingMethod}</legend>
        {options.map((option) => (
          <OptionCard
            key={option.method}
            name="shipping-method"
            value={option.method}
            checked={values.method === option.method}
            label={option.label}
            hint={option.eta}
            aside={costLabel(option.costArs)}
            onSelect={() => {
              setValues({ ...values, method: option.method })
              onMethodChange(option.method)
            }}
          />
        ))}
        <span className="text-[12px] text-neutral-500">{CHECKOUT_COPY.shippingNote}</span>
      </fieldset>

      {values.method === 'pickup' ? (
        <p className="m-0 text-[14px] leading-[1.6] text-neutral-300">{pickupNote(email)}</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-4">
          {addresses.length > 0 ? (
            <Field label={CHECKOUT_COPY.savedAddress} className="col-span-full">
              {(control) => (
                <Select
                  {...control}
                  value=""
                  onChange={(event) => {
                    const chosen = addresses.find((address) => address.id === event.target.value)
                    if (chosen === undefined) return
                    setAddress({
                      street: chosen.street,
                      number: chosen.number,
                      apartment: chosen.apartment ?? '',
                      postalCode: chosen.postalCode,
                      city: chosen.city,
                      province: chosen.province,
                    })
                  }}
                >
                  <option value="">{CHECKOUT_COPY.savedAddressPlaceholder}</option>
                  {addresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {addressLabel(address)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : null}
          {fields.map((name) => {
            const input = ADDRESS_INPUTS[name]
            const common = {
              form,
              name,
              label: input.label,
              value: values.address[name],
              autoComplete: input.autoComplete,
              onChange: (value: string) => {
                setAddress({ [name]: value })
              },
            }
            return name === 'province' ? (
              <SelectField
                key={name}
                {...common}
                placeholder={CHECKOUT_COPY.provincePlaceholder}
                options={PROVINCES}
              />
            ) : (
              <TextField key={name} {...common} placeholder={input.placeholder} />
            )
          })}
        </div>
      )}
      <StepActions onBack={onBack} />
    </form>
  )
}
