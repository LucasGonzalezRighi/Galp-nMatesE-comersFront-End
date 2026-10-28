import type { ReactNode } from 'react'
import type { FieldPath } from 'react-hook-form'
import { useFormContext } from 'react-hook-form'
import type { AdminProduct, HomeContent, ProductGroup } from '@galpon/api-client'
import type { HomeContentFormInput } from '@galpon/schemas'
import type { SelectOption } from '../../../components/ui/Select'
import { Field } from '../../../components/ui/Field'
import { Section } from '../../../components/ui/Section'
import { Select } from '../../../components/ui/Select'
import { CONTENT_COPY, positionLabel, unpublishedProductLabel } from '../content.copy'
import { fieldIndex } from '../list-utils'
import { FieldGroup } from './FieldGroup'

/** Props de {@link ProductSelect}. */
interface ProductSelectProps {
  /** Ruta del slug en el formulario. */
  name: FieldPath<HomeContentFormInput>
  /** Texto del label. */
  label: string
  /** Productos que se pueden elegir. */
  options: readonly SelectOption[]
}

/** Lista de productos de un lugar de la historia, registrada en el formulario del inicio. */
function ProductSelect({ name, label, options }: ProductSelectProps): ReactNode {
  const { register, getFieldState, formState } = useFormContext<HomeContentFormInput>()
  const { error } = getFieldState(name, formState)
  return (
    <Field label={label} error={error?.message}>
      {(control) => (
        <Select
          {...control}
          options={options}
          placeholder={CONTENT_COPY.chooseProduct}
          {...register(name)}
        />
      )}
    </Field>
  )
}

/**
 * Opciones de un grupo: sus productos publicados (por nombre) y, al final, los slugs guardados
 * que ya no están publicados, así el campo no queda vacío sin avisar.
 */
function groupOptions(
  products: readonly AdminProduct[],
  group: ProductGroup,
  saved: readonly string[],
): SelectOption[] {
  const options: SelectOption[] = products
    .filter((product) => product.group === group)
    .map((product) => ({ value: product.slug, label: product.name }))
  const values = new Set(options.map((option) => option.value))
  for (const slug of saved) {
    if (slug.trim() === '' || values.has(slug)) continue
    values.add(slug)
    options.push({ value: slug, label: unpublishedProductLabel(slug) })
  }
  return options
}

/** Props de {@link HomeProductsFields}. */
export interface HomeProductsFieldsProps {
  /** Productos publicados. */
  products: readonly AdminProduct[]
  /** Slugs guardados, para no perder uno que ya no está publicado. */
  saved: HomeContent['storyProducts']
}

/**
 * Sección "Productos de la historia" del formulario del inicio: "Mate de la portada", las 2
 * "Bombillas" y las 3 "Yerbas", cada una con una lista de los publicados de su grupo. Va dentro
 * del `FormProvider` del inicio.
 *
 * @param props - Ver {@link HomeProductsFieldsProps}.
 */
export function HomeProductsFields({ products, saved }: HomeProductsFieldsProps): ReactNode {
  const mates = groupOptions(products, 'mate', [saved.hero])
  const bombillas = groupOptions(products, 'bombilla', saved.bombillas)
  const yerbas = groupOptions(products, 'yerba', saved.yerbas)
  return (
    <Section title={CONTENT_COPY.storyProducts}>
      <ProductSelect name="storyProducts.hero" label={CONTENT_COPY.heroMate} options={mates} />
      <FieldGroup title={CONTENT_COPY.bombillas}>
        <div className="grid gap-4 sm:grid-cols-2">
          {saved.bombillas.map((_, index) => (
            <ProductSelect
              key={index}
              name={`storyProducts.bombillas.${fieldIndex(index)}`}
              label={positionLabel(CONTENT_COPY.bombilla, index + 1)}
              options={bombillas}
            />
          ))}
        </div>
      </FieldGroup>
      <FieldGroup title={CONTENT_COPY.yerbas}>
        <div className="grid gap-4 sm:grid-cols-3">
          {saved.yerbas.map((_, index) => (
            <ProductSelect
              key={index}
              name={`storyProducts.yerbas.${fieldIndex(index)}`}
              label={positionLabel(CONTENT_COPY.yerba, index + 1)}
              options={yerbas}
            />
          ))}
        </div>
      </FieldGroup>
    </Section>
  )
}
