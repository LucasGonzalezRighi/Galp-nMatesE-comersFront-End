import type { ReactNode } from 'react'
import { useFormContext } from 'react-hook-form'
import type { SettingsForm, SettingsFormInput } from '@galpon/schemas'
import { Field } from '../../../components/ui/Field'
import { TextInput } from '../../../components/ui/TextInput'
import { SETTINGS_COPY } from '../settings.copy'

/**
 * Datos del vendedor y de la atención al cliente (Disposición 954/2025): razón social, CUIT
 * (viene con guiones, `formatCuit`), domicilio, teléfono o canal alternativo, área responsable,
 * horario de atención y el link de Data Fiscal, con la nota de dónde se muestran. La condición
 * fiscal, también del vendedor, va en "Precio sin impuestos nacionales". Va dentro del
 * `FormProvider` de `SettingsForm`.
 */
export function SellerFields(): ReactNode {
  const {
    register,
    formState: { errors },
  } = useFormContext<SettingsFormInput, undefined, SettingsForm>()
  const sellerErrors = errors.seller
  const copy = SETTINGS_COPY.seller
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
        <Field label={copy.legalName} error={sellerErrors?.legalName?.message}>
          {(control) => (
            <TextInput {...control} autoComplete="organization" {...register('seller.legalName')} />
          )}
        </Field>
        <Field label={copy.cuit} error={sellerErrors?.cuit?.message}>
          {(control) => <TextInput {...control} autoComplete="off" {...register('seller.cuit')} />}
        </Field>
        <Field label={copy.address} error={sellerErrors?.address?.message}>
          {(control) => (
            <TextInput {...control} autoComplete="street-address" {...register('seller.address')} />
          )}
        </Field>
        <Field label={copy.phone} error={sellerErrors?.phone?.message}>
          {(control) => <TextInput {...control} autoComplete="tel" {...register('seller.phone')} />}
        </Field>
        <Field label={copy.supportArea} error={sellerErrors?.supportArea?.message}>
          {(control) => (
            <TextInput {...control} autoComplete="off" {...register('seller.supportArea')} />
          )}
        </Field>
        <Field
          label={copy.supportHours}
          hint={copy.supportHoursHint}
          error={sellerErrors?.supportHours?.message}
        >
          {(control) => (
            <TextInput {...control} autoComplete="off" {...register('seller.supportHours')} />
          )}
        </Field>
        <Field
          label={copy.dataFiscalUrl}
          error={sellerErrors?.dataFiscalUrl?.message}
          className="sm:col-span-2"
        >
          {(control) => (
            <TextInput
              {...control}
              type="url"
              autoComplete="url"
              {...register('seller.dataFiscalUrl')}
            />
          )}
        </Field>
      </div>
      <p className="text-sm text-neutral-400">{copy.note}</p>
    </>
  )
}
