import type { ReactNode } from 'react'
import { useFormContext } from 'react-hook-form'
import type { SettingsForm, SettingsFormInput } from '@galpon/schemas'
import { Field } from '../../../components/ui/Field'
import { TextInput } from '../../../components/ui/TextInput'
import { SETTINGS_COPY } from '../settings.copy'

/**
 * Enlaces de Defensa del Consumidor (LA-4): el de la Ciudad (Ley 2244) y el formulario nacional
 * de reclamos, los dos obligatorios (`settingsFormSchema.consumerLinks`), con la ayuda de que la
 * tienda los muestra siempre en el pie. Va dentro del `FormProvider` de `SettingsForm`.
 */
export function ConsumerLinksFields(): ReactNode {
  const {
    register,
    formState: { errors },
  } = useFormContext<SettingsFormInput, undefined, SettingsForm>()
  const linkErrors = errors.consumerLinks
  const copy = SETTINGS_COPY.consumer
  return (
    <>
      <div className="grid gap-4">
        <Field label={copy.cabaUrl} error={linkErrors?.cabaUrl?.message} required>
          {(control) => (
            <TextInput
              {...control}
              type="url"
              autoComplete="url"
              {...register('consumerLinks.cabaUrl')}
            />
          )}
        </Field>
        <Field label={copy.nationalUrl} error={linkErrors?.nationalUrl?.message} required>
          {(control) => (
            <TextInput
              {...control}
              type="url"
              autoComplete="url"
              {...register('consumerLinks.nationalUrl')}
            />
          )}
        </Field>
      </div>
      <p className="text-sm text-neutral-400">{copy.hint}</p>
    </>
  )
}
