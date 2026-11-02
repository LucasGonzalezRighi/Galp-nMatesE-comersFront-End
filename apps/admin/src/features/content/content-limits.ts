/*
 * Límites de los formularios de Contenido: largos máximos de los campos y cantidades de las
 * listas. Copian los de los schemas de `@galpon/schemas` (`packages/schemas/src/content.ts` y,
 * en las fotos, `imageFormSchema` de `admin.ts`), que todavía no los exportan: si un límite cambia
 * allá, hay que cambiarlo acá (`content-limits.test.ts` avisa si se separan). Cuando el paquete
 * los exporte, este archivo se reemplaza por esos imports. Hay una constante por formulario.
 */

/** "Título en líneas" (`titleLines` de `homeContentFormSchema` y `aboutContentFormSchema`). */
export const TITLE_LINES_LIMITS = {
  /** Menos líneas que puede tener un título. */
  minLines: 1,
  /** Más líneas que puede tener un título. */
  maxLines: 3,
  /** Largo máximo de cada línea. */
  line: 60,
} as const

/** Inicio (`homeContentFormSchema`). */
export const HOME_LIMITS = {
  /** Antetítulos (portada, escenas, secciones, manifiesto y kit). */
  eyebrow: 60,
  /** Títulos de las secciones y del kit. */
  title: 60,
  /** Textos de bloque (portada, escenas y kit). */
  text: 600,
  /** Textos de los botones y del enlace del manifiesto. */
  buttonLabel: 40,
  /** Cantidad de pasos del ritual. */
  ritualSteps: 4,
  /** Cada paso del ritual. */
  ritualStep: 80,
  /** Frase del manifiesto. */
  manifestoText: 400,
} as const

/** Nosotros (`aboutContentFormSchema`; la foto de cada socio, `imageFormSchema`). */
export const ABOUT_LIMITS = {
  /** Antetítulos de la portada y de "Cómo trabajamos". */
  eyebrow: 60,
  /** Texto de la portada. */
  text: 600,
  /** Más socios que admite la página. */
  partners: 8,
  /** Nombre de un socio. */
  partnerName: 60,
  /** Rol de un socio. */
  partnerRole: 80,
  /** Largo mínimo del texto alternativo de la foto. */
  photoAltMin: 3,
  /** Largo máximo del texto alternativo de la foto. */
  photoAlt: 120,
  /** Frase destacada. */
  quote: 300,
  /** Cantidad de pasos de "Cómo trabajamos". */
  steps: 3,
  /** Título de un paso. */
  stepTitle: 60,
  /** Texto de un paso. */
  stepText: 400,
  /** Texto del botón a la tienda. */
  buttonLabel: 40,
} as const

/** Preguntas frecuentes (`faqContentFormSchema`; el identificador, `slugSchema`). */
export const FAQ_LIMITS = {
  /** Más categorías que admite la página. */
  categories: 10,
  /** Nombre de una categoría. */
  categoryLabel: 40,
  /** Identificador de una categoría. */
  categoryId: 80,
  /** Más preguntas por categoría. */
  questions: 30,
  /** Una pregunta. */
  question: 200,
  /** Una respuesta. */
  answer: 2000,
} as const

/** Pie de página (`footerContentFormSchema`). */
export const FOOTER_LIMITS = {
  /** Frase. */
  tagline: 80,
  /** Texto. */
  text: 300,
  /** Más medios de pago que admite el pie. */
  paymentMethods: 10,
  /** Un medio de pago. */
  paymentMethod: 40,
  /** Link a Defensa del Consumidor. */
  consumerDefenseUrl: 2048,
} as const

/** Pestañas de la ficha (`productTabsContentFormSchema`). */
export const PRODUCT_TABS_LIMITS = {
  /** Nota bajo la descripción. */
  descriptionNote: 600,
  /** Títulos de las pestañas de materiales y de cuidado. */
  tabTitle: 30,
  /** Textos de materiales, de cuidado y de envío y cambios. */
  tabText: 2000,
} as const

/** Documento legal (`legalContentFormSchema`). */
export const LEGAL_LIMITS = {
  /** Título. */
  title: 120,
  /** Cuerpo del documento. */
  body: 60_000,
} as const
