import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import type { AdminProduct, HomeContent } from '@galpon/api-client'
import type { HomeContentForm as HomeContentValues, HomeContentFormInput } from '@galpon/schemas'
import { updateAdminHomeContent } from '@galpon/api-client'
import { queryKeys, useApiClient } from '@galpon/api-client/react'
import { homeContentFormSchema } from '@galpon/schemas'
import { Field } from '../../../components/ui/Field'
import { FormActions } from '../../../components/ui/FormActions'
import { NumberInput } from '../../../components/ui/NumberInput'
import { Section } from '../../../components/ui/Section'
import { UnsavedChangesGuard } from '../../../components/ui/UnsavedChangesGuard'
import { homeFormValues } from '../content-form-values'
import { CONTENT_COPY, positionLabel } from '../content.copy'
import { fieldIndex } from '../list-utils'
import { useSaveContent } from '../use-save-content'
import { FieldGroup } from './FieldGroup'
import { HomeProductsFields } from './HomeProductsFields'
import { HomeStoryFields } from './HomeStoryFields'
import { TextField } from './TextField'
import { TitleLinesField } from './TitleLinesField'

/** Campo de texto del formulario del inicio. */
const HomeText = TextField<HomeContentFormInput>

/** Encabezados de las secciones del inicio que se editan igual: antetítulo y título. */
const SECTION_HEADINGS = [
  { name: 'collection', label: CONTENT_COPY.collection },
  { name: 'featured', label: CONTENT_COPY.featured },
  { name: 'reviews', label: CONTENT_COPY.reviews },
] as const

/** Cantidad de pasos del ritual (la de `homeContentFormSchema`). */
const RITUAL_STEPS = 4

/** Props de {@link HomeContentForm}. */
export interface HomeContentFormProps {
  /** Inicio como lo devuelve la API. */
  content: HomeContent
  /** Productos publicados, para elegir los de la historia. */
  products: readonly AdminProduct[]
}

/**
 * Formulario del inicio (`homeContentFormSchema`): portada, historia, pasos del ritual,
 * productos de la historia, encabezados, manifiesto, cifras y bloque del kit. Guarda la página
 * entera con `PUT /admin/content/home`.
 *
 * @param props - Ver {@link HomeContentFormProps}.
 */
export function HomeContentForm({ content, products }: HomeContentFormProps): ReactNode {
  const api = useApiClient()
  const form = useForm<HomeContentFormInput, undefined, HomeContentValues>({
    resolver: zodResolver(homeContentFormSchema),
    mode: 'onTouched',
    defaultValues: homeFormValues(content),
  })
  const save = useSaveContent({
    queryKey: queryKeys.adminContent('home'),
    save: (body: HomeContentValues) => updateAdminHomeContent(api, body),
    setError: form.setError,
    onSaved: (saved) => {
      form.reset(homeFormValues(saved))
    },
  })
  const submit = form.handleSubmit((values) => {
    save.mutate(values)
  })
  const { isDirty, errors } = form.formState

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={(event) => {
          void submit(event)
        }}
        className="flex flex-col gap-6"
      >
        <Section title={CONTENT_COPY.hero}>
          <HomeText name="hero.eyebrow" label={CONTENT_COPY.eyebrow} maxLength={60} />
          <TitleLinesField<HomeContentFormInput> name="hero.titleLines" />
          <HomeText name="hero.text" label={CONTENT_COPY.text} maxLength={600} multiline />
          <div className="grid gap-4 sm:grid-cols-2">
            <HomeText name="hero.primaryCtaLabel" label={CONTENT_COPY.primaryCta} maxLength={40} />
            <HomeText
              name="hero.secondaryCtaLabel"
              label={CONTENT_COPY.secondaryCta}
              maxLength={40}
            />
          </div>
        </Section>
        <HomeStoryFields sceneKeys={content.scenes.map((scene) => scene.key)} />
        <Section title={CONTENT_COPY.ritualSteps}>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: RITUAL_STEPS }, (_, index) => (
              <HomeText
                key={index}
                name={`ritualSteps.${fieldIndex(index)}`}
                label={positionLabel(CONTENT_COPY.step, index + 1)}
                maxLength={80}
              />
            ))}
          </div>
        </Section>
        <HomeProductsFields products={products} saved={content.storyProducts} />
        <Section title={CONTENT_COPY.sectionHeadings}>
          {SECTION_HEADINGS.map(({ name, label }) => (
            <FieldGroup key={name} title={label}>
              <div className="grid gap-4 sm:grid-cols-2">
                <HomeText name={`${name}.eyebrow`} label={CONTENT_COPY.eyebrow} maxLength={60} />
                <HomeText name={`${name}.title`} label={CONTENT_COPY.heading} maxLength={60} />
              </div>
            </FieldGroup>
          ))}
        </Section>
        <Section title={CONTENT_COPY.manifesto}>
          <HomeText name="manifesto.eyebrow" label={CONTENT_COPY.eyebrow} maxLength={60} />
          <HomeText name="manifesto.text" label={CONTENT_COPY.phrase} maxLength={400} multiline />
          <HomeText name="manifesto.ctaLabel" label={CONTENT_COPY.linkText} maxLength={40} />
        </Section>
        <Section title={CONTENT_COPY.stats}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="stats.provinces"
              render={({ field }) => (
                <Field label={CONTENT_COPY.provinces} error={errors.stats?.provinces?.message}>
                  {(control) => <NumberInput {...control} {...field} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="stats.partners"
              render={({ field }) => (
                <Field label={CONTENT_COPY.partnersCount} error={errors.stats?.partners?.message}>
                  {(control) => <NumberInput {...control} {...field} />}
                </Field>
              )}
            />
          </div>
        </Section>
        <Section title={CONTENT_COPY.kitBlock}>
          <HomeText name="kitBlock.eyebrow" label={CONTENT_COPY.eyebrow} maxLength={60} />
          <HomeText name="kitBlock.title" label={CONTENT_COPY.heading} maxLength={60} />
          <HomeText name="kitBlock.text" label={CONTENT_COPY.text} maxLength={600} multiline />
          <HomeText name="kitBlock.ctaLabel" label={CONTENT_COPY.button} maxLength={40} />
        </Section>
        <FormActions
          isDirty={isDirty}
          isSubmitting={save.isPending}
          onDiscard={() => {
            form.reset()
          }}
        />
        <UnsavedChangesGuard when={isDirty} />
      </form>
    </FormProvider>
  )
}
