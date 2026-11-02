import type { FieldPath } from 'react-hook-form'
import { z } from 'zod'
import type { AdminProduct, AdminProductInput, ImageInput } from '@galpon/api-client'
import { imageFormSchema, MESSAGES, productFormSchema } from '@galpon/schemas'
import { MAX_PRODUCT_PHOTOS } from './products.constants'

/** Campos de `productFormSchema` más los que el formulario necesita para mostrarse. */
const productFormFieldsSchema = productFormSchema.extend({
  priceOnRequest: z.boolean(),
  stock: z.number().nullable().pipe(productFormSchema.shape.stock),
  images: z
    .array(imageFormSchema.extend({ url: z.string() }))
    .max(MAX_PRODUCT_PHOTOS, MESSAGES.maxImages(MAX_PRODUCT_PHOTOS)),
})

/**
 * Sin "a consultar", el precio es obligatorio. Va en un objeto aparte (y se une con `.and`)
 * porque un refinamiento del objeto entero no corre si otro campo ya cortó la validación (un
 * nombre vacío): así el aviso del precio sale junto con el resto.
 */
const priceRuleSchema = z
  .object({ priceOnRequest: z.boolean(), priceArs: z.number().nullable() })
  .refine((values) => values.priceOnRequest || values.priceArs !== null, {
    path: ['priceArs'],
    message: MESSAGES.invalidPrice,
  })

/**
 * Reglas del formulario de producto: las de `productFormSchema` más lo que el formulario necesita
 * para mostrarse.
 *
 * - `priceOnRequest`: la casilla "Precio a consultar"; sin ella, el precio es obligatorio
 *   (`MESSAGES.invalidPrice`).
 * - `stock`: vacío (`null`) mientras no se escribe; al validar pide un entero de 0 a 9999.
 * - `images`: cada foto lleva su `url` para la vista previa (no se manda a la API).
 */
export const productFormValuesSchema = productFormFieldsSchema.and(priceRuleSchema)

/** Valores del formulario de producto, como los edita la pantalla. */
export type ProductFormValues = z.input<typeof productFormValuesSchema>

/** Valores del formulario ya validados (textos recortados, stock entero). */
export type ProductFormOutput = z.output<typeof productFormValuesSchema>

/** Una foto del formulario: la que se guarda más la `url` para la vista previa. */
export type ProductPhotoValue = ProductFormValues['images'][number]

/**
 * Valores de un producto nuevo: vacío, en borrador, sin precio elegido ni fotos.
 *
 * @returns Los valores iniciales de `/productos/nuevo`.
 */
export function newProductFormValues(): ProductFormValues {
  return {
    name: '',
    slug: '',
    categoryId: '',
    description: '',
    priceArs: null,
    priceOnRequest: false,
    stock: null,
    featured: false,
    status: 'draft',
    images: [],
    tabsOverride: { materials: '', care: '' },
  }
}

/**
 * Pasa un producto guardado al formulario. Las fotos llevan su `url` para la vista previa; sin
 * precio queda marcado "a consultar"; un archivado queda en borrador (el formulario no elige
 * "archivado": se vuelve a publicar aparte); los textos propios vacíos quedan en `''`.
 *
 * @param product - Producto del dashboard.
 * @returns Los valores del formulario.
 */
export function toProductFormValues(product: AdminProduct): ProductFormValues {
  return {
    name: product.name,
    slug: product.slug,
    categoryId: product.categoryId,
    description: product.description,
    priceArs: product.priceArs,
    priceOnRequest: product.priceArs === null,
    stock: product.stock,
    featured: product.featured,
    status: product.status === 'archived' ? 'draft' : product.status,
    images: product.images.map(({ publicId, url, width, height, alt }) => ({
      publicId,
      url,
      width,
      height,
      alt,
    })),
    tabsOverride: {
      materials: product.tabsOverride?.materials ?? '',
      care: product.tabsOverride?.care ?? '',
    },
  }
}

/**
 * Saca la `url` de una foto: la API solo recibe el `publicId`, las medidas y el texto alternativo.
 *
 * @param photo - Foto con o sin `url`.
 * @returns La foto como la recibe la API.
 */
function toImageInput(photo: ImageInput & { url?: string }): ImageInput {
  return { publicId: photo.publicId, width: photo.width, height: photo.height, alt: photo.alt }
}

/**
 * Arma el cuerpo de `POST` / `PATCH /admin/products` con los valores ya validados: fotos sin
 * `url`, precio en `null` si es "a consultar" y `tabsOverride` en `null` si no hay ningún texto
 * propio (si hay uno solo, el otro va en `null` y usa el de su grupo).
 *
 * @param values - Valores validados por {@link productFormValuesSchema}.
 * @returns El producto como lo recibe la API (sin `expectedUpdatedAt`).
 */
export function toAdminProductInput(values: ProductFormOutput): AdminProductInput {
  const materials = values.tabsOverride?.materials ?? null
  const care = values.tabsOverride?.care ?? null
  return {
    name: values.name,
    slug: values.slug,
    categoryId: values.categoryId,
    description: values.description,
    priceArs: values.priceOnRequest ? null : values.priceArs,
    stock: values.stock,
    featured: values.featured,
    status: values.status,
    images: values.images.map(toImageInput),
    tabsOverride: materials === null && care === null ? null : { materials, care },
  }
}

/**
 * Cuerpo de `PATCH` para volver a publicar un producto archivado: lo guardado, con
 * `status: 'published'` y la fecha de la versión que se abrió.
 *
 * @param product - Producto guardado (archivado).
 * @param expectedUpdatedAt - `updatedAt` de la versión que muestra la pantalla.
 * @returns El cuerpo del `PATCH`.
 * @throws {RangeError} Si la fecha está vacía.
 */
export function republishInput(
  product: AdminProduct,
  expectedUpdatedAt: string,
): AdminProductInput {
  if (expectedUpdatedAt.trim() === '') {
    throw new RangeError('La fecha de la versión abierta no puede estar vacía.')
  }
  return {
    name: product.name,
    slug: product.slug,
    categoryId: product.categoryId,
    description: product.description,
    priceArs: product.priceArs,
    stock: product.stock,
    featured: product.featured,
    status: 'published',
    images: product.images.map(toImageInput),
    tabsOverride: product.tabsOverride,
    expectedUpdatedAt,
  }
}

/** Campos del formulario que puede nombrar un `422` (las fotos, con su índice). */
const FORM_PATH =
  /^(?:name|slug|categoryId|description|priceArs|stock|featured|status|tabsOverride\.(?:materials|care)|images(?:\.\d+(?:\.(?:alt|publicId|width|height))?)?)$/

/**
 * Indica si un campo de un `422` (`error.fieldErrors`) es un campo del formulario, para ponerle
 * el error con `setError`.
 *
 * @param path - Ruta con puntos, por ejemplo `images.2.alt`.
 * @returns `true` si el formulario muestra ese campo.
 */
export function isProductFormPath(path: string): path is FieldPath<ProductFormValues> {
  return FORM_PATH.test(path)
}

/**
 * Ruta del texto alternativo de una foto (`images.{n}.alt`), con el tipo que espera `register`.
 *
 * @param index - Lugar de la foto en el formulario, desde 0.
 * @returns La ruta, por ejemplo `images.2.alt`.
 * @throws {RangeError} Si el lugar no es un entero mayor o igual a 0.
 */
export function photoAltPath(index: number): `images.${number}.alt` {
  if (!Number.isSafeInteger(index) || index < 0) {
    throw new RangeError(
      `El lugar de la foto tiene que ser un entero mayor o igual a 0; se recibió ${String(index)}.`,
    )
  }
  return `images.${String(index)}.alt` as `images.${number}.alt`
}
