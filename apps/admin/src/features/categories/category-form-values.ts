import type { Category } from '@galpon/api-client'
import type { CategoryFormInput } from '@galpon/schemas'

/** Largo máximo de la bajada de una línea (`categoryFormSchema`). */
export const CATEGORY_BLURB_MAX_LENGTH = 200

/**
 * Valores con los que arranca el formulario de una línea: vacío (grupo de los mates, sin foto)
 * para una nueva, o los de la línea que se edita. La foto va sin `url`: el formulario guarda lo
 * que pide `CategoryInput` y la API arma la dirección desde `publicId`.
 *
 * @param category - La línea que se edita, o `null` para una nueva.
 * @returns Los valores iniciales para `categoryFormSchema`.
 */
export function categoryFormValues(category: Category | null): CategoryFormInput {
  if (category === null) return { name: '', slug: '', group: 'mate', blurb: '', image: null }
  const { image } = category
  return {
    name: category.name,
    slug: category.slug,
    group: category.group,
    blurb: category.blurb,
    image:
      image === null
        ? null
        : { publicId: image.publicId, width: image.width, height: image.height, alt: image.alt },
  }
}
