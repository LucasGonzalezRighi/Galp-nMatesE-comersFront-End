import type { ProductGroup, StoryScene } from '@galpon/api-client'

/** Textos de las pantallas de Contenido. */
export const CONTENT_COPY = {
  title: 'Contenido',
  /** Nota debajo del título de todas las pantallas. */
  note: 'Los textos se muestran tal cual, sin formato. Para separar párrafos, dejá una línea en blanco.',
  /** Nombre accesible de la navegación entre las páginas de contenido. */
  navLabel: 'Secciones del contenido',
  nav: {
    home: 'Inicio',
    about: 'Nosotros',
    faq: 'Preguntas',
    productTabs: 'Pestañas',
    footer: 'Pie',
    legal: 'Legales',
  },
  /** Aviso oculto (`role="status"`) mientras carga el contenido. */
  loading: 'Cargando el contenido…',
  loadError: 'No pudimos cargar el contenido.',
  saved: 'Contenido guardado.',
  /** Aviso cuando el guardado falla sin un mensaje de la API. */
  saveError: 'No pudimos guardar el contenido. Probá de nuevo.',
  eyebrow: 'Antetítulo',
  heading: 'Título',
  text: 'Texto',
  titleLines: 'Título en líneas',
  line: 'Línea',
  addLine: 'Agregar línea',
  moveUp: 'Subir',
  moveDown: 'Bajar',
  remove: 'Quitar',
  drag: 'Arrastrar',
  hero: 'Portada',
  primaryCta: 'Botón principal',
  secondaryCta: 'Botón secundario',
  story: 'Historia',
  scenes: {
    pieces: 'Las piezas',
    gourd: 'La calabaza',
    bombilla: 'La bombilla',
    yerba: 'La yerba',
    ritual: 'El ritual',
    leather: 'El cuero',
  } satisfies Record<StoryScene['key'], string>,
  optionalCta: 'Botón (opcional)',
  ritualSteps: 'Pasos del ritual',
  step: 'Paso',
  storyProducts: 'Productos de la historia',
  heroMate: 'Mate de la portada',
  bombillas: 'Bombillas',
  bombilla: 'Bombilla',
  yerbas: 'Yerbas',
  yerba: 'Yerba',
  chooseProduct: 'Elegí un producto',
  sectionHeadings: 'Encabezados de secciones',
  collection: 'Colección',
  featured: 'Destacados',
  reviews: 'Reseñas',
  manifesto: 'Manifiesto',
  phrase: 'Frase',
  linkText: 'Texto del enlace',
  stats: 'Cifras',
  provinces: 'Provincias con envío',
  partnersCount: 'Socios',
  kitBlock: 'Bloque del kit',
  button: 'Botón',
  partners: 'Socios',
  partnersHint: 'Hasta 8 socios, en el orden en que se muestran.',
  partner: 'Socio',
  partnerName: 'Nombre',
  partnerRole: 'Rol',
  partnerPhoto: 'Foto',
  photoAlt: 'Texto alternativo',
  addPartner: 'Agregar socio',
  howWeWork: 'Cómo trabajamos',
  storeButton: 'Botón a la tienda',
  buttonText: 'Texto del botón',
  waitForUploads: 'Esperá a que terminen de subir las fotos.',
  failedUploads: 'Hay fotos que no se subieron: reintentá o quitalas.',
  categories: 'Categorías',
  category: 'Categoría',
  categoryName: 'Nombre',
  categoryId: 'Identificador',
  /** Ayuda del identificador de una categoría ya guardada (o que se cambió a mano). */
  categoryIdHint: 'Va en la dirección de la página.',
  /** Ayuda del identificador de una categoría nueva, mientras sigue al nombre. */
  categoryIdAutoHint: 'Va en la dirección de la página. Se completa solo a partir del nombre.',
  addCategory: 'Agregar categoría',
  question: 'Pregunta',
  answer: 'Respuesta',
  addQuestion: 'Agregar pregunta',
  duplicateCategoryId: 'Ya hay otra categoría con este identificador.',
  groups: {
    mate: 'Mates',
    bombilla: 'Bombillas',
    yerba: 'Yerbas',
  } satisfies Record<ProductGroup, string>,
  descriptionNote: 'Nota bajo la descripción (opcional)',
  materialsTitle: 'Título de la pestaña de materiales',
  materials: 'Materiales',
  careTitle: 'Título de la pestaña de cuidado',
  care: 'Cuidado',
  allGroups: 'Todos los grupos',
  shipping: 'Envío y cambios (común a todos)',
  footer: 'Pie de página',
  paymentMethods: 'Medios de pago',
  paymentMethod: 'Medio de pago',
  addPaymentMethod: 'Agregar medio de pago',
  consumerDefense: 'Link a Defensa del Consumidor (opcional)',
  /** Nombre accesible de las pestañas de Legales. */
  legalTabs: 'Documento legal',
  terms: 'Términos y condiciones',
  privacy: 'Política de privacidad',
  updatedAt: 'Última actualización',
  updatedAtHint: 'Al cambiar el texto se propone la fecha de hoy.',
  legalWarning: 'Revisá los textos legales con un profesional antes de publicarlos.',
} as const

/**
 * Valida que un texto no esté vacío.
 *
 * @throws {RangeError} Si está vacío.
 */
function assertText(text: string, what: string): void {
  if (text.trim() === '') {
    throw new RangeError(`${what} no puede estar vacío.`)
  }
}

/**
 * Valida que un lugar sea un entero desde 1.
 *
 * @throws {RangeError} Si no lo es.
 */
function assertPosition(position: number): void {
  if (!Number.isSafeInteger(position) || position < 1) {
    throw new RangeError(
      `El lugar tiene que ser un entero mayor o igual a 1; se recibió ${String(position)}.`,
    )
  }
}

/**
 * Nombre de un elemento por su lugar en una lista.
 *
 * @param noun - Qué es, por ejemplo "Línea" o "Paso".
 * @param position - Lugar, desde 1.
 * @returns Por ejemplo "Línea 2".
 * @throws {RangeError} Si `noun` está vacío o `position` no es un entero desde 1.
 */
export function positionLabel(noun: string, position: number): string {
  assertText(noun, 'El nombre del elemento')
  assertPosition(position)
  return `${noun} ${String(position)}`
}

/**
 * Nombre de un botón que actúa sobre un elemento con nombre.
 *
 * @param verb - La acción, por ejemplo "Subir" o "Quitar".
 * @param name - El elemento, por ejemplo "Envíos".
 * @returns Por ejemplo "Subir Envíos".
 * @throws {RangeError} Si alguno está vacío.
 */
export function actionLabel(verb: string, name: string): string {
  assertText(verb, 'La acción')
  assertText(name, 'El nombre del elemento')
  return `${verb} ${name}`
}

/**
 * Botón que quita una línea del título.
 *
 * @param position - Lugar de la línea, desde 1.
 * @returns Por ejemplo "Quitar la línea 2".
 * @throws {RangeError} Si `position` no es un entero desde 1.
 */
export function removeLineLabel(position: number): string {
  assertPosition(position)
  return `Quitar la línea ${String(position)}`
}

/**
 * Botón que quita un medio de pago del pie.
 *
 * @param position - Lugar del medio de pago, desde 1.
 * @returns Por ejemplo "Quitar el medio de pago 3".
 * @throws {RangeError} Si `position` no es un entero desde 1.
 */
export function removePaymentMethodLabel(position: number): string {
  assertPosition(position)
  return `Quitar el medio de pago ${String(position)}`
}

/**
 * Botón que quita a un socio de Nosotros.
 *
 * @param name - Nombre del socio (o "Socio 2" si todavía no tiene).
 * @returns Por ejemplo "Quitar a Bruno Galimberti".
 * @throws {RangeError} Si el nombre está vacío.
 */
export function removePartnerLabel(name: string): string {
  assertText(name, 'El nombre del socio')
  return `Quitar a ${name}`
}

/**
 * Nombre de una pregunta dentro de su categoría, para sus botones.
 *
 * @param position - Lugar de la pregunta en la categoría, desde 1.
 * @param category - Nombre de la categoría.
 * @returns Por ejemplo "la pregunta 2 de Envíos".
 * @throws {RangeError} Si `position` no es un entero desde 1 o la categoría está vacía.
 */
export function questionName(position: number, category: string): string {
  assertPosition(position)
  assertText(category, 'El nombre de la categoría')
  return `la pregunta ${String(position)} de ${category}`
}

/**
 * Nombre de la lista de preguntas de una categoría.
 *
 * @param category - Nombre de la categoría.
 * @returns Por ejemplo "Preguntas de Envíos".
 * @throws {RangeError} Si la categoría está vacía.
 */
export function questionsListLabel(category: string): string {
  assertText(category, 'El nombre de la categoría')
  return `Preguntas de ${category}`
}

/**
 * Opción de un producto de la historia que ya no está publicado.
 *
 * @param slug - Slug guardado.
 * @returns Por ejemplo "mate-viejo (no está publicado)".
 * @throws {RangeError} Si el slug está vacío.
 */
export function unpublishedProductLabel(slug: string): string {
  assertText(slug, 'El slug')
  return `${slug} (no está publicado)`
}
