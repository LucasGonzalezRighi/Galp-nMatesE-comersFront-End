import { z } from 'zod'
import { imageFormSchema, slugSchema } from './admin'
import { MESSAGES } from './messages'

/** Escenas de la historia del inicio (`StoryScene.key` del contrato), cada una una sola vez. */
const STORY_SCENE_KEYS = ['pieces', 'gourd', 'bombilla', 'yerba', 'ritual', 'leather'] as const

/** Fecha sin hora, como `LegalContent.updatedAt`. */
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Texto obligatorio: se recorta, vacío da "Requerido" y más largo que `max` da el máximo.
 *
 * @param max - Máximo de caracteres.
 * @returns Schema del texto ya recortado.
 */
function text(max: number) {
  return z
    .string({ error: MESSAGES.required })
    .trim()
    .min(1, { error: MESSAGES.required, abort: true })
    .max(max, MESSAGES.max(max))
}

/**
 * Texto que puede faltar: se recorta y, si queda vacío (o es `null`), sale `null`.
 *
 * @param max - Máximo de caracteres.
 * @returns Schema del texto ya recortado o `null`.
 */
function nullableText(max: number) {
  return z
    .string({ error: MESSAGES.required })
    .trim()
    .max(max, MESSAGES.max(max))
    .nullable()
    .transform((value) => (value === '' ? null : value))
}

/**
 * Lista con una cantidad fija de elementos.
 *
 * @param item - Schema de cada elemento.
 * @param count - Cantidad exacta.
 * @param noun - Nombre de los elementos en plural, para el mensaje.
 * @returns Schema de la lista.
 */
function exactList<T extends z.ZodType>(item: T, count: number, noun: string) {
  return z.array(item).length(count, MESSAGES.exactItems(count, noun))
}

/**
 * Lista con un mínimo y un máximo de elementos.
 *
 * @param item - Schema de cada elemento.
 * @param min - Menor cantidad permitida.
 * @param max - Mayor cantidad permitida.
 * @param noun - Nombre de los elementos en plural, para el mensaje.
 * @returns Schema de la lista.
 */
function boundedList<T extends z.ZodType>(item: T, min: number, max: number, noun: string) {
  const error = MESSAGES.itemsBetween(min, max, noun)
  return z.array(item).min(min, error).max(max, error)
}

/** Antetítulo: el texto corto que va arriba de un título, hasta 60 caracteres. */
const eyebrow = text(60)

/** Título en líneas: de 1 a 3, de hasta 60 caracteres cada una. */
const titleLines = boundedList(text(60), 1, 3, 'líneas')

/** Texto de un bloque, hasta 600 caracteres. */
const blockText = text(600)

/** Texto de un botón, hasta 40 caracteres. */
const buttonLabel = text(40)

/** Cifra del inicio: entero de 0 a 999. */
const statNumber = z
  .int({ error: MESSAGES.intBetween(0, 999) })
  .min(0, MESSAGES.intBetween(0, 999))
  .max(999, MESSAGES.intBetween(0, 999))

/** Encabezado de una sección del inicio: antetítulo y título (hasta 60). */
const sectionHeadingSchema = z.object({ eyebrow, title: text(60) })

/** Escena de la historia del inicio; el botón es opcional (vacío queda en `null`). */
const storySceneSchema = z.object({
  key: z.enum(STORY_SCENE_KEYS),
  eyebrow,
  titleLines,
  text: blockText,
  ctaLabel: nullableText(40),
})

/**
 * Textos editables del inicio (`HomeContent`).
 *
 * Antetítulos y líneas de título hasta 60 (de 1 a 3 líneas), textos hasta 600, botones hasta 40,
 * las 6 escenas (cada una una sola vez), los 4 pasos del ritual (hasta 80), los slugs de los
 * productos de la historia (1 mate, 2 bombillas y 3 yerbas), el manifiesto (frase hasta 400) y las
 * cifras (enteros de 0 a 999). Todo se recorta y un obligatorio vacío da "Requerido".
 */
export const homeContentFormSchema = z.object({
  hero: z.object({
    eyebrow,
    titleLines,
    text: blockText,
    primaryCtaLabel: buttonLabel,
    secondaryCtaLabel: buttonLabel,
  }),
  scenes: exactList(storySceneSchema, STORY_SCENE_KEYS.length, 'escenas').refine(
    (scenes) => new Set(scenes.map((scene) => scene.key)).size === scenes.length,
    { error: MESSAGES.duplicateScenes },
  ),
  ritualSteps: exactList(text(80), 4, 'pasos'),
  storyProducts: z.object({
    hero: slugSchema,
    bombillas: exactList(slugSchema, 2, 'bombillas'),
    yerbas: exactList(slugSchema, 3, 'yerbas'),
  }),
  collection: sectionHeadingSchema,
  featured: sectionHeadingSchema,
  reviews: sectionHeadingSchema,
  manifesto: z.object({ eyebrow, text: text(400), ctaLabel: buttonLabel }),
  stats: z.object({ provinces: statNumber, partners: statNumber }),
  kitBlock: z.object({ eyebrow, title: text(60), text: blockText, ctaLabel: buttonLabel }),
})

/** Inicio como lo arma el formulario. */
export type HomeContentFormInput = z.input<typeof homeContentFormSchema>

/** Inicio ya normalizado, listo para `PUT /admin/content/home`. */
export type HomeContentForm = z.output<typeof homeContentFormSchema>

/**
 * Textos editables de Nosotros (`AboutContentInput`).
 *
 * Portada como la del inicio, hasta 8 socios (nombre hasta 60, rol hasta 80 y una foto o `null`),
 * la frase destacada (hasta 300) y exactamente 3 pasos (título hasta 60 y texto hasta 400).
 */
export const aboutContentFormSchema = z.object({
  hero: z.object({ eyebrow, titleLines, text: blockText }),
  partners: z
    .array(z.object({ name: text(60), role: text(80), photo: imageFormSchema.nullable() }))
    .max(8, MESSAGES.maxItems(8, 'socios')),
  quote: text(300),
  stepsEyebrow: eyebrow,
  steps: exactList(z.object({ title: text(60), text: text(400) }), 3, 'pasos'),
  ctaLabel: buttonLabel,
})

/** Nosotros como lo arma el formulario. */
export type AboutContentFormInput = z.input<typeof aboutContentFormSchema>

/** Nosotros ya normalizado, listo para `PUT /admin/content/about`. */
export type AboutContentForm = z.output<typeof aboutContentFormSchema>

/**
 * Preguntas frecuentes (`FaqContent`): de 1 a 10 categorías (identificador con formato de slug y
 * nombre hasta 40), cada una con 1 a 30 preguntas (pregunta hasta 200 y respuesta hasta 2000).
 */
export const faqContentFormSchema = z.object({
  categories: boundedList(
    z.object({
      id: slugSchema,
      label: text(40),
      items: boundedList(z.object({ question: text(200), answer: text(2000) }), 1, 30, 'preguntas'),
    }),
    1,
    10,
    'categorías',
  ),
})

/** Preguntas como las arma el formulario. */
export type FaqContentFormInput = z.input<typeof faqContentFormSchema>

/** Preguntas ya normalizadas, listas para `PUT /admin/content/faq`. */
export type FaqContentForm = z.output<typeof faqContentFormSchema>

/** Enlace a Defensa del Consumidor: http o https, hasta 2048 caracteres; vacío queda en `null`. */
const consumerDefenseUrlSchema = z
  .string({ error: MESSAGES.required })
  .trim()
  .nullable()
  .transform((value) => (value === '' ? null : value))
  .pipe(
    z
      .string()
      .max(2048, MESSAGES.max(2048))
      .pipe(z.url({ protocol: /^https?$/, error: MESSAGES.invalidUrl }))
      .nullable(),
  )

/**
 * Pie de página (`FooterContent`): frase hasta 80, texto hasta 300, hasta 10 medios de pago (de
 * hasta 40) y el enlace a Defensa del Consumidor (http o https) o `null`.
 */
export const footerContentFormSchema = z.object({
  tagline: text(80),
  text: text(300),
  paymentMethods: z.array(text(40)).max(10, MESSAGES.maxItems(10, 'medios de pago')),
  consumerDefenseUrl: consumerDefenseUrlSchema,
})

/** Pie como lo arma el formulario. */
export type FooterContentFormInput = z.input<typeof footerContentFormSchema>

/** Pie ya normalizado, listo para `PUT /admin/content/footer`. */
export type FooterContentForm = z.output<typeof footerContentFormSchema>

/** Pestañas de un grupo: nota hasta 600 o `null`, títulos hasta 30 y textos hasta 2000. */
const productTabsGroupSchema = z.object({
  descriptionNote: nullableText(600),
  materialsTitle: text(30),
  materials: text(2000),
  careTitle: text(30),
  care: text(2000),
})

/**
 * Textos de fábrica de las pestañas de la ficha (`ProductTabsContent`): los de cada grupo y el de
 * envío y cambios (hasta 2000), común a todos.
 */
export const productTabsContentFormSchema = z.object({
  mate: productTabsGroupSchema,
  bombilla: productTabsGroupSchema,
  yerba: productTabsGroupSchema,
  shipping: text(2000),
})

/** Pestañas como las arma el formulario. */
export type ProductTabsContentFormInput = z.input<typeof productTabsContentFormSchema>

/** Pestañas ya normalizadas, listas para `PUT /admin/content/product-tabs`. */
export type ProductTabsContentForm = z.output<typeof productTabsContentFormSchema>

/**
 * Indica si un texto `AAAA-MM-DD` es un día que existe en el calendario.
 *
 * @param value - Texto a revisar.
 * @returns `true` si tiene el formato y el día existe (el 30 de febrero, no).
 */
function isCalendarDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value)
  if (match === null) return false
  const date = new Date(`${value}T00:00:00Z`)
  return (
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() + 1 === Number(match[2]) &&
    date.getUTCDate() === Number(match[3])
  )
}

/**
 * Documento legal (`LegalContent`): título hasta 120, fecha de actualización `AAAA-MM-DD` y el
 * cuerpo, de 1 a 60.000 caracteres.
 */
export const legalContentFormSchema = z.object({
  title: text(120),
  updatedAt: z
    .string({ error: MESSAGES.required })
    .trim()
    .min(1, { error: MESSAGES.required, abort: true })
    .refine(isCalendarDate, { error: MESSAGES.invalidDate }),
  body: text(60_000),
})

/** Documento legal como lo arma el formulario. */
export type LegalContentFormInput = z.input<typeof legalContentFormSchema>

/** Documento legal ya normalizado, listo para `PUT /admin/content/legal/{document}`. */
export type LegalContentForm = z.output<typeof legalContentFormSchema>
