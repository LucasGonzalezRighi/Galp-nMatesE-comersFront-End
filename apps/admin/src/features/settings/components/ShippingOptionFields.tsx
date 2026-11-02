import type { ReactNode } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import type { ShippingMethod } from '@galpon/domain'
import type { SettingsForm, SettingsFormInput } from '@galpon/schemas'
import { Field } from '../../../components/ui/Field'
import { MoneyInput } from '../../../components/ui/MoneyInput'
import { Switch } from '../../../components/ui/Switch'
import { TextInput } from '../../../components/ui/TextInput'
import { shippingFieldPath } from '../settings-form-values'
import { SETTINGS_COPY } from '../settings.copy'

/** Props de {@link ShippingOptionFields}. */
export interface ShippingOptionFieldsProps {
  /** Lugar de la opción en `shippingOptions` (el orden de `SHIPPING_METHODS`). */
  index: number
  /** Método de la opción: define su nombre fijo. */
  method: ShippingMethod
}

/**
 * Fila de un método de envío del formulario de ajustes, agrupada con su nombre fijo ("Envío a
 * domicilio"): "Habilitado", "Costo" (con 0, la ayuda dice "Gratis") y "Plazo". Va dentro del
 * `FormProvider` de `SettingsForm`.
 *
 * @param props - Ver {@link ShippingOptionFieldsProps}.
 */
export function ShippingOptionFields({ index, method }: ShippingOptionFieldsProps): ReactNode {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<SettingsFormInput, undefined, SettingsForm>()
  const optionErrors = errors.shippingOptions?.[index]
  return (
    <fieldset className="m-0 min-w-0 border-0 px-0 py-4 first:pt-0 last:pb-0">
      <legend className="text-h5 mb-4 p-0">{SETTINGS_COPY.shipping.methods[method]}</legend>
      <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] sm:items-start">
        <Controller
          control={control}
          name={shippingFieldPath(index, 'enabled')}
          render={({ field }) => (
            <Switch
              label={SETTINGS_COPY.shipping.enabled}
              name={field.name}
              checked={field.value}
              onCheckedChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              className="sm:mt-6"
            />
          )}
        />
        <Controller
          control={control}
          name={shippingFieldPath(index, 'costArs')}
          render={({ field }) => (
            <Field
              label={SETTINGS_COPY.shipping.cost}
              hint={field.value === 0 ? SETTINGS_COPY.shipping.free : undefined}
              error={optionErrors?.costArs?.message}
              required
            >
              {(controlProps) => (
                <MoneyInput
                  {...controlProps}
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                />
              )}
            </Field>
          )}
        />
        <Field label={SETTINGS_COPY.shipping.eta} error={optionErrors?.eta?.message} required>
          {(controlProps) => (
            <TextInput
              {...controlProps}
              placeholder={SETTINGS_COPY.shipping.etaPlaceholder}
              autoComplete="off"
              {...register(shippingFieldPath(index, 'eta'))}
            />
          )}
        </Field>
      </div>
    </fieldset>
  )
}
