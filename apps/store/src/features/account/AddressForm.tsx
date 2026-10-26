'use client'

import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useId } from 'react'
import { useForm } from 'react-hook-form'
import type { Address, AddressBookInput } from '@galpon/api-client'
import { Button, Field, Input, Select } from '@/components/ui'
import { PROVINCES } from '@galpon/domain'
import { addressBookEntrySchema } from '@galpon/schemas'
import { ACCOUNT_COPY } from './account.copy'
import { showSubmitError } from './form-errors'
import { FORM_CARD, FormError } from './form-parts'

/** Campos que la API puede marcar con error. */
const FIELDS = [
  'label',
  'street',
  'number',
  'apartment',
  'postalCode',
  'city',
  'province',
  'isDefault',
] as const

const COPY = ACCOUNT_COPY.addresses

/** Props de {@link AddressForm}. */
export interface AddressFormProps {
  /** Dirección que se edita, o `undefined` para una nueva. */
  address?: Address
  /** Guarda la dirección; si falla, lanza el error de la API (se muestra en el formulario). */
  onSave: (input: AddressBookInput) => Promise<void>
  /** Cierra el formulario sin guardar. */
  onCancel: () => void
}

/**
 * Formulario de una dirección de la libreta (`addressBookEntrySchema`): nombre opcional ("Casa"),
 * calle, número ("S/N" si no tiene), piso o depto, código postal, ciudad, provincia y si es la
 * predeterminada. Los errores aparecen al salir de cada campo y al guardar.
 *
 * @param props - Ver {@link AddressFormProps}.
 */
export function AddressForm({ address, onSave, onCancel }: AddressFormProps): ReactNode {
  const titleId = useId()
  const {
    register: field,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(addressBookEntrySchema),
    mode: 'onTouched',
    defaultValues: {
      label: address?.label ?? '',
      street: address?.street ?? '',
      number: address?.number ?? '',
      apartment: address?.apartment ?? '',
      postalCode: address?.postalCode ?? '',
      city: address?.city ?? '',
      province: address?.province,
      isDefault: address?.isDefault ?? false,
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await onSave({
        ...values,
        label: values.label ?? null,
        apartment: values.apartment ?? null,
      })
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
      <h2 id={titleId} className="text-[18px]">
        {address === undefined ? COPY.newTitle : COPY.editTitle}
      </h2>
      <Field label={COPY.label} error={errors.label?.message}>
        {(control) => (
          <Input
            {...control}
            {...field('label')}
            autoComplete="off"
            placeholder={COPY.labelPlaceholder}
          />
        )}
      </Field>
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
        <Field label={COPY.street} error={errors.street?.message}>
          {(control) => <Input {...control} {...field('street')} autoComplete="address-line1" />}
        </Field>
        <Field label={COPY.number} error={errors.number?.message}>
          {(control) => (
            <Input {...control} {...field('number')} placeholder={COPY.numberPlaceholder} />
          )}
        </Field>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] gap-4">
        <Field label={COPY.apartment} error={errors.apartment?.message}>
          {(control) => <Input {...control} {...field('apartment')} autoComplete="address-line2" />}
        </Field>
        <Field label={COPY.postalCode} error={errors.postalCode?.message}>
          {(control) => <Input {...control} {...field('postalCode')} autoComplete="postal-code" />}
        </Field>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] gap-4">
        <Field label={COPY.city} error={errors.city?.message}>
          {(control) => <Input {...control} {...field('city')} autoComplete="address-level2" />}
        </Field>
        <Field label={COPY.province} error={errors.province?.message}>
          {(control) => (
            <Select {...control} {...field('province')} autoComplete="address-level1">
              <option value="">{COPY.provincePlaceholder}</option>
              {PROVINCES.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <label className="flex items-center gap-[10px] text-[14px]">
        <input type="checkbox" className="accent-accent size-4" {...field('isDefault')} />
        {COPY.isDefault}
      </label>
      <FormError message={errors.root?.server?.message} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={isSubmitting}>
          {isSubmitting ? ACCOUNT_COPY.submitting : COPY.save}
        </Button>
        <Button variant="secondary" disabled={isSubmitting} onClick={onCancel}>
          {COPY.cancel}
        </Button>
      </div>
    </form>
  )
}
