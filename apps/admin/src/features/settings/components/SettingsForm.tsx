import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import type { AdminSettings } from '@galpon/api-client'
import type { SettingsForm as SettingsFormValues, SettingsFormInput } from '@galpon/schemas'
import { isApiError, updateAdminSettings } from '@galpon/api-client'
import { queryKeys, useApiClient } from '@galpon/api-client/react'
import { SHIPPING_METHODS } from '@galpon/domain'
import { settingsFormSchema } from '@galpon/schemas'
import { Field } from '../../../components/ui/Field'
import { FormActions } from '../../../components/ui/FormActions'
import { NumberInput } from '../../../components/ui/NumberInput'
import { Section } from '../../../components/ui/Section'
import { Switch } from '../../../components/ui/Switch'
import { TextInput } from '../../../components/ui/TextInput'
import { toast } from '../../../components/ui/toast'
import { UnsavedChangesGuard } from '../../../components/ui/UnsavedChangesGuard'
import { SETTINGS_FIELDS, settingsFormValues, settingsInput } from '../settings-form-values'
import { SETTINGS_COPY } from '../settings.copy'
import { SellerFields } from './SellerFields'
import { ShippingOptionFields } from './ShippingOptionFields'

/** Props de {@link SettingsForm}. */
export interface SettingsFormProps {
  /** Los ajustes guardados, con los que arranca el formulario. */
  settings: AdminSettings
}

/**
 * Formulario de ajustes (`settingsFormSchema`), en una sola página: "Kit", "Envíos", "Cuotas",
 * "Precio sin impuestos nacionales", "Vendedor y atención al cliente", "Contacto" y "Stock", con
 * `FormActions` abajo y `UnsavedChangesGuard`. Al guardar avisa "Ajustes guardados.", vuelve a
 * arrancar con lo guardado e invalida los ajustes y el resumen; un `422` va a cada campo y otro
 * error, a un toast.
 *
 * @param props - Ver {@link SettingsFormProps}.
 */
export function SettingsForm({ settings }: SettingsFormProps): ReactNode {
  const api = useApiClient()
  const queryClient = useQueryClient()
  const [defaultValues] = useState(() => settingsFormValues(settings))
  const form = useForm<SettingsFormInput, undefined, SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues,
  })
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = form
  const save = useMutation({
    mutationFn: (values: SettingsFormValues) => updateAdminSettings(api, settingsInput(values)),
    onSuccess: async (saved) => {
      queryClient.setQueryData(queryKeys.adminSettings(), saved)
      reset(settingsFormValues(saved))
      toast.success(SETTINGS_COPY.saved)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.adminSettings() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.adminDashboard() }),
      ])
    },
    onError: (error) => {
      if (!isApiError(error)) {
        toast.error(SETTINGS_COPY.saveError)
        return
      }
      // "Tu sesión venció" (401) y el token CSRF rotado (403) los resuelve la estructura.
      if (error.kind === 'unauthorized' || error.kind === 'forbidden') return
      const withError = SETTINGS_FIELDS.filter((field) => error.fieldErrors[field] !== undefined)
      for (const field of withError) setError(field, { message: error.fieldErrors[field] })
      if (withError.length === 0) toast.error(error.message)
    },
  })
  const submit = handleSubmit((values) => {
    save.mutate(values)
  })

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={(event) => {
          void submit(event)
        }}
        className="flex flex-col gap-6"
      >
        <Section title={SETTINGS_COPY.kit.title}>
          <Controller
            control={control}
            name="kitDiscountPercent"
            render={({ field }) => (
              <Field
                label={SETTINGS_COPY.kit.discount}
                hint={SETTINGS_COPY.kit.discountHint}
                error={errors.kitDiscountPercent?.message}
                required
                className="sm:max-w-sm"
              >
                {(controlProps) => (
                  <NumberInput
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
        </Section>

        <Section title={SETTINGS_COPY.shipping.title}>
          <div className="divide-divider flex flex-col divide-y">
            {SHIPPING_METHODS.map((method, index) => (
              <ShippingOptionFields key={method} index={index} method={method} />
            ))}
          </div>
          {errors.shippingOptions?.message !== undefined && (
            <p role="alert" className="text-danger text-sm">
              {errors.shippingOptions.message}
            </p>
          )}
        </Section>

        <Section title={SETTINGS_COPY.installments.title}>
          <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
            <Controller
              control={control}
              name="installments.maxWithoutInterest"
              render={({ field }) => (
                <Field
                  label={SETTINGS_COPY.installments.max}
                  hint={SETTINGS_COPY.installments.maxHint}
                  error={errors.installments?.maxWithoutInterest?.message}
                  required
                >
                  {(controlProps) => (
                    <NumberInput
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
            <Controller
              control={control}
              name="installments.showOnProduct"
              render={({ field }) => (
                <Switch
                  label={SETTINGS_COPY.installments.showOnProduct}
                  name={field.name}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  className="sm:mt-6"
                />
              )}
            />
          </div>
        </Section>

        <Section title={SETTINGS_COPY.tax.title} description={SETTINGS_COPY.tax.description}>
          <Controller
            control={control}
            name="priceDisplay.showNetPrice"
            render={({ field }) => (
              <Switch
                label={SETTINGS_COPY.tax.showNetPrice}
                name={field.name}
                checked={field.value}
                onCheckedChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
              />
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
            <Controller
              control={control}
              name="vatRatePercent"
              render={({ field }) => (
                <Field
                  label={SETTINGS_COPY.tax.vatRate}
                  hint={SETTINGS_COPY.tax.vatRateHint}
                  error={errors.vatRatePercent?.message}
                  required
                >
                  {(controlProps) => (
                    <NumberInput
                      {...controlProps}
                      allowDecimal
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
            <Field
              label={SETTINGS_COPY.tax.taxCondition}
              error={errors.seller?.taxCondition?.message}
            >
              {(controlProps) => (
                <TextInput
                  {...controlProps}
                  autoComplete="off"
                  {...register('seller.taxCondition')}
                />
              )}
            </Field>
          </div>
        </Section>

        <Section title={SETTINGS_COPY.seller.title} description={SETTINGS_COPY.seller.description}>
          <SellerFields />
        </Section>

        <Section title={SETTINGS_COPY.contact.title}>
          <Field
            label={SETTINGS_COPY.contact.email}
            error={errors.contactEmail?.message}
            required
            className="sm:max-w-md"
          >
            {(controlProps) => (
              <TextInput
                {...controlProps}
                type="email"
                autoComplete="email"
                {...register('contactEmail')}
              />
            )}
          </Field>
        </Section>

        <Section title={SETTINGS_COPY.stock.title}>
          <Controller
            control={control}
            name="lowStockThreshold"
            render={({ field }) => (
              <Field
                label={SETTINGS_COPY.stock.lowStockThreshold}
                hint={SETTINGS_COPY.stock.lowStockThresholdHint}
                error={errors.lowStockThreshold?.message}
                required
                className="sm:max-w-md"
              >
                {(controlProps) => (
                  <NumberInput
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
        </Section>

        <FormActions
          isDirty={isDirty}
          isSubmitting={save.isPending}
          onDiscard={() => {
            reset()
          }}
        />
        <UnsavedChangesGuard when={isDirty} />
      </form>
    </FormProvider>
  )
}
