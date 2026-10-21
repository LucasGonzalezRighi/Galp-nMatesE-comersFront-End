import { z } from 'zod'
import type { ProductStatus, ShippingMethod } from '@galpon/domain'
import { MAX_KIT_DISCOUNT_PERCENT, PRODUCT_GROUPS, SHIPPING_METHODS } from '@galpon/domain'
import { loginPasswordSchema, passwordSchema } from './account'
import { emailSchema, optionalTextSchema } from './fields'
import { MESSAGES } from './messages'

/** Slug: minúsculas y números separados por guiones simples. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** CUIT con guiones (`20-12345678-6`) o solo con los 11 dígitos. */
const CUIT_PATTERN = /^(?:\d{11}|\d{2}-\d{8}-\d)$/

/** Pesos del dígito verificador del CUIT, para los primeros 10 dígitos. */
const CUIT_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2] as const

/** Máximo de fotos de un producto (spec 11.4). */
const MAX_PRODUCT_IMAGES = 8

/** Máximo de caracteres del texto propio de cada pestaña de un producto. */
const MAX_TAB_TEXT = 2000

/** Estados que el formulario del producto permite elegir: el archivado se hace aparte. */
const FORM_PRODUCT_STATUSES = ['draft', 'published'] as const satisfies readonly ProductStatus[]

/**
 * Texto obligatorio: se recorta, vacío da "Requerido" y fuera de rango da el mínimo o el máximo.
 *
 * @param min - Mínimo de caracteres.
 * @param max - Máximo de caracteres.
 * @returns Schema del texto ya recortado.
 */
function requiredText(min: number, max: number) {
  return z
    .string({ error: MESSAGES.required })
    .trim()
    .min(1, { error: MESSAGES.required, abort: true })
    .min(min, MESSAGES.min(min))
    .max(max, MESSAGES.max(max))
}

/**
 * Entero entre `min` y `max` (ambos incluidos) con un único mensaje para todo lo que falle.
 *
 * @param min - Menor valor permitido.
 * @param max - Mayor valor permitido.
 * @returns Schema de un entero en ese rango.
 */
function boundedInt(min: number, max: number) {
  const error = MESSAGES.intBetween(min, max)
  return z.int({ error }).min(min, error).max(max, error)
}

/**
 * Hace que un dato de texto sea `string | null`: `null`, vacío o solo espacios quedan en `null` y
 * el resto sigue la regla de `schema`.
 *
 * @param schema - Regla del texto cuando hay algo escrito (recibe el texto sin recortar).
 * @returns Schema cuya salida es el texto validado o `null`.
 */
function emptyAsNull(schema: z.ZodType<string, string>) {
  return z
    .string({ error: MESSAGES.required })
    .nullable()
    .transform((value) => (value === null || value.trim() === '' ? null : value))
    .pipe(schema.nullable())
}

/**
 * Texto de un dato del vendedor: recortado, de hasta `max` caracteres, o `null` si está vacío.
 *
 * @param max - Máximo de caracteres.
 * @returns Schema del dato.
 */
function sellerText(max: number) {
  return emptyAsNull(z.string().trim().max(max, MESSAGES.max(max)))
}

/**
 * Revisa el dígito verificador de un CUIT de 11 dígitos.
 *
 * Se multiplican los primeros 10 dígitos por sus pesos y se suman. El dígito verificador es
 * `11 - (suma % 11)`; si da 11 vale 0 y si da 10 el CUIT no es válido (ningún dígito lo cumple).
 *
 * @param digits - Los 11 dígitos, sin guiones.
 * @returns `true` si el último dígito es el verificador que corresponde.
 */
function hasValidCuitCheckDigit(digits: string): boolean {
  const sum = CUIT_WEIGHTS.reduce(
    (total, weight, index) => total + weight * Number(digits.charAt(index)),
    0,
  )
  const remainder = sum % 11
  const expected = remainder === 0 ? 0 : 11 - remainder
  return Number(digits.charAt(10)) === expected
}

/**
 * Revisa que haya exactamente una opción de envío por cada método.
 *
 * @param options - Opciones del formulario de ajustes.
 * @returns `true` si están los tres métodos de `SHIPPING_METHODS`, una vez cada uno.
 */
function hasEachShippingMethodOnce(options: readonly { method: ShippingMethod }[]): boolean {
  return (
    options.length === SHIPPING_METHODS.length &&
    SHIPPING_METHODS.every(
      (method) => options.filter((option) => option.method === method).length === 1,
    )
  )
}

/**
 * Slug de un producto o una categoría: de 1 a 80 caracteres, minúsculas, números y guiones.
 *
 * La unicidad la controla el back; acá solo se revisa el formato.
 *
 * @example
 * slugSchema.parse('mate-imperial') // "mate-imperial"
 */
export const slugSchema = z
  .string({ error: MESSAGES.required })
  .trim()
  .min(1, { error: MESSAGES.required, abort: true })
  .max(80, MESSAGES.max(80))
  .regex(SLUG_PATTERN, MESSAGES.invalidSlug)

/**
 * Foto ya subida a Cloudinary: su identificador, las medidas y el texto alternativo (3 a 120
 * caracteres, obligatorio).
 */
export const imageFormSchema = z.object({
  publicId: requiredText(1, 255),
  width: z.int({ error: MESSAGES.positiveInt }).positive(MESSAGES.positiveInt),
  height: z.int({ error: MESSAGES.positiveInt }).positive(MESSAGES.positiveInt),
  alt: z
    .string({ error: MESSAGES.imageAlt })
    .trim()
    .min(3, MESSAGES.imageAlt)
    .max(120, MESSAGES.imageAlt),
})

/** Foto como la arma el formulario, antes de normalizar el texto alternativo. */
export type ImageFormInput = z.input<typeof imageFormSchema>

/** Foto ya normalizada. */
export type ImageForm = z.output<typeof imageFormSchema>

/**
 * Formulario de producto del dashboard.
 *
 * - `name` (3 a 120), `slug`, `categoryId` y `description` (10 a 2000).
 * - `priceArs`: entero mayor a 0 en pesos, o `null` para "a consultar".
 * - `stock`: entero de 0 a 9999.
 * - `status`: borrador o publicado.
 * - `tabsOverride`: texto propio de Materiales y Cuidados (hasta 2000 cada uno); vacío queda en
 *   `undefined`, y entonces la pestaña usa el texto del grupo.
 * - `images`: hasta 8 fotos, la primera es la principal.
 */
export const productFormSchema = z.object({
  name: requiredText(3, 120),
  slug: slugSchema,
  categoryId: requiredText(1, 100),
  description: requiredText(10, 2000),
  priceArs: z.int({ error: MESSAGES.invalidPrice }).positive(MESSAGES.invalidPrice).nullable(),
  stock: boundedInt(0, 9999),
  featured: z.boolean(),
  status: z.enum(FORM_PRODUCT_STATUSES, { error: MESSAGES.invalidProductStatus }),
  tabsOverride: z
    .object({
      materials: optionalTextSchema(MAX_TAB_TEXT),
      care: optionalTextSchema(MAX_TAB_TEXT),
    })
    .optional(),
  images: z.array(imageFormSchema).max(MAX_PRODUCT_IMAGES, MESSAGES.maxImages(MAX_PRODUCT_IMAGES)),
})

/** Producto como lo arma el formulario, antes de normalizarlo. */
export type ProductFormInput = z.input<typeof productFormSchema>

/** Producto ya normalizado. */
export type ProductForm = z.output<typeof productFormSchema>

/**
 * Formulario de categoría del dashboard: nombre (2 a 60), slug, grupo, descripción corta (hasta
 * 200, puede estar vacía) y una foto o `null`.
 */
export const categoryFormSchema = z.object({
  name: requiredText(2, 60),
  slug: slugSchema,
  group: z.enum(PRODUCT_GROUPS, { error: MESSAGES.invalidGroup }),
  blurb: z.string({ error: MESSAGES.required }).trim().max(200, MESSAGES.max(200)),
  image: imageFormSchema.nullable(),
})

/** Categoría como la arma el formulario, antes de normalizarla. */
export type CategoryFormInput = z.input<typeof categoryFormSchema>

/** Categoría ya normalizada. */
export type CategoryForm = z.output<typeof categoryFormSchema>

/**
 * CUIT: acepta `20-12345678-6` o los 11 dígitos pegados, y devuelve siempre los 11 dígitos.
 *
 * Revisa el dígito verificador; un CUIT que no lo cumple da "CUIT inválido".
 *
 * @example
 * cuitSchema.parse('20-12345678-6') // "20123456786"
 */
export const cuitSchema = z
  .string({ error: MESSAGES.invalidCuit })
  .trim()
  .regex(CUIT_PATTERN, MESSAGES.invalidCuit)
  .transform((value) => value.replace(/-/g, ''))
  .refine(hasValidCuitCheckDigit, { error: MESSAGES.invalidCuit })

/** Opción de envío del formulario de ajustes: un costo, un plazo y si está habilitada. */
const shippingOptionFormSchema = z.object({
  method: z.enum(SHIPPING_METHODS),
  costArs: z.int({ error: MESSAGES.invalidAmount }).min(0, MESSAGES.invalidAmount),
  eta: requiredText(2, 60),
  enabled: z.boolean(),
})

/** Dirección web del vendedor (Data Fiscal): solo http o https, hasta 2048 caracteres. */
const dataFiscalUrlSchema = z
  .string()
  .trim()
  .max(2048, MESSAGES.max(2048))
  .pipe(z.url({ protocol: /^https?$/, error: MESSAGES.invalidUrl }))

/**
 * Formulario de ajustes del dashboard.
 *
 * - `kitDiscountPercent`: entero de 0 a 30.
 * - `shippingOptions`: exactamente tres, una por método, con costo desde 0 y plazo de 2 a 60.
 * - `installments`: cuotas sin interés (1 a 12) y si se muestran en la ficha.
 * - `lowStockThreshold`: entero de 0 a 999.
 * - `vatRatePercent`: de 0 a 100, admite decimales (10,5).
 * - `seller`: datos del vendedor (Disp. 954/2025). Cada uno es texto o `null`; vacío queda en
 *   `null`. El CUIT sale con 11 dígitos y `dataFiscalUrl` es una URL http o https.
 */
export const settingsFormSchema = z.object({
  kitDiscountPercent: boundedInt(0, MAX_KIT_DISCOUNT_PERCENT),
  shippingOptions: z
    .array(shippingOptionFormSchema)
    .refine(hasEachShippingMethodOnce, { error: MESSAGES.invalidShippingOptions }),
  installments: z.object({
    maxWithoutInterest: boundedInt(1, 12),
    showOnProduct: z.boolean(),
  }),
  contactEmail: emailSchema,
  lowStockThreshold: boundedInt(0, 999),
  vatRatePercent: z
    .number({ error: MESSAGES.numberBetween(0, 100) })
    .min(0, MESSAGES.numberBetween(0, 100))
    .max(100, MESSAGES.numberBetween(0, 100)),
  priceDisplay: z.object({ showNetPrice: z.boolean() }),
  seller: z.object({
    legalName: sellerText(120),
    cuit: emptyAsNull(cuitSchema),
    taxCondition: sellerText(60),
    address: sellerText(200),
    phone: sellerText(60),
    supportArea: sellerText(80),
    supportHours: sellerText(120),
    dataFiscalUrl: emptyAsNull(dataFiscalUrlSchema),
  }),
})

/** Ajustes como los arma el formulario, antes de normalizarlos. */
export type SettingsFormInput = z.input<typeof settingsFormSchema>

/** Ajustes ya normalizados. */
export type SettingsForm = z.output<typeof settingsFormSchema>

/** Despacho de un pedido: empresa de envío (2 a 40) y número de seguimiento (4 a 40). */
export const dispatchSchema = z.object({
  carrier: requiredText(2, 40),
  trackingNumber: requiredText(4, 40),
})

/** Despacho como lo escribe el administrador. */
export type DispatchFormInput = z.input<typeof dispatchSchema>

/** Despacho ya normalizado. */
export type DispatchForm = z.output<typeof dispatchSchema>

/** Inicio de sesión del administrador: email y contraseña. */
export const adminLoginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
})

/** Inicio de sesión del administrador como lo escribe. */
export type AdminLoginInput = z.input<typeof adminLoginSchema>

/** Inicio de sesión del administrador ya normalizado. */
export type AdminLogin = z.output<typeof adminLoginSchema>

/**
 * Cambio de contraseña del administrador: la actual, la nueva (con la regla de
 * `passwordSchema`) y su confirmación, que si no coincide da el error en `confirmation`.
 */
export const adminPasswordChangeSchema = z
  .object({
    currentPassword: loginPasswordSchema,
    newPassword: passwordSchema,
    confirmation: z.string({ error: MESSAGES.required }),
  })
  .refine((value) => value.newPassword === value.confirmation, {
    error: MESSAGES.passwordMismatch,
    path: ['confirmation'],
  })

/** Cambio de contraseña como lo escribe el administrador. */
export type AdminPasswordChangeInput = z.input<typeof adminPasswordChangeSchema>

/** Cambio de contraseña ya validado. */
export type AdminPasswordChange = z.output<typeof adminPasswordChangeSchema>
