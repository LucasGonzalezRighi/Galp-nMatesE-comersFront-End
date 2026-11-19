import type { ProductGroup } from '@galpon/domain'
import { formatDiscountPercent, pluralize } from '@galpon/domain'

/** Microtextos de "Armá tu kit", tal como están en el diseño y en el spec (9.4, 9.5 y 9.7). */
export const KIT_COPY = {
  /** Sobretítulo de la página. */
  eyebrow: 'Armá tu kit',
  /** Título, primera línea. */
  titleFirst: 'Tres pasos.',
  /** Título, segunda línea (en cobre). */
  titleSecond: 'Una ronda completa.',
  /** Nombre accesible de la barra de pasos. */
  stepsLabel: 'Pasos del kit',
  /** Texto de un paso sin pieza elegida. */
  unchosen: 'Sin elegir',
  /** Texto del paso Resumen cuando están las tres piezas. */
  readyToAdd: 'Listo para agregar',
  /** Nombre del cuarto paso. */
  summaryStep: 'Resumen',
  /** Título de la vista Resumen. */
  reviewTitle: 'Tu kit',
  /** Ayuda de la vista Resumen. */
  reviewHint: 'Revisá las piezas. Tocá cualquiera para cambiarla.',
  /** Título del panel del costado. */
  panelTitle: 'Resumen del kit',
  /** Nombre accesible de las muestras de cuero. */
  leatherLabel: 'Color',
  /** Renglón del subtotal. */
  subtotal: 'Subtotal',
  /** Renglón del total. */
  total: 'Total',
  /** Botón que agrega el kit al carrito (con las tres piezas, o deshabilitado sin ninguna). */
  addKit: 'Agregar kit al carrito',
  /** Botón que agrega una o dos piezas como productos sueltos, a precio de lista (Ruling AI-6). */
  addPieces: 'Agregar al carrito',
  /** Botón que reinicia las piezas elegidas. */
  startOver: 'Empezar de nuevo',
  /** Valor de un renglón de la vista Resumen sin pieza elegida. */
  noPrice: '—',
} as const

/** Nombre de cada grupo en singular y con su artículo ("el mate"), para "Te falta elegir…". */
const GROUP_WITH_ARTICLE: Record<ProductGroup, string> = {
  mate: 'el mate',
  bombilla: 'la bombilla',
  yerba: 'la yerba',
}

/** Etiqueta de cada grupo en el panel, el paso y la vista Resumen. */
export const GROUP_LABEL: Record<ProductGroup, string> = {
  mate: 'Mate',
  bombilla: 'Bombilla',
  yerba: 'Yerba',
}

/** Título de cada paso de elección. */
const GROUP_TITLE: Record<ProductGroup, string> = {
  mate: 'Elegí el mate',
  bombilla: 'Elegí la bombilla',
  yerba: 'Elegí la yerba',
}

/** Grupo en plural, para "No hay … disponibles por ahora". */
const GROUP_PLURAL: Record<ProductGroup, string> = {
  mate: 'mates',
  bombilla: 'bombillas',
  yerba: 'yerbas',
}

/**
 * Título del paso de elección de un grupo.
 *
 * @param group - Grupo que se está eligiendo.
 * @returns "Elegí el mate", "Elegí la bombilla" o "Elegí la yerba".
 */
export function stepTitle(group: ProductGroup): string {
  return GROUP_TITLE[group]
}

/**
 * Ayuda bajo el título del paso de elección. La del mate lleva la cantidad de mates comprables
 * (spec 9.5).
 *
 * @param group - Grupo que se está eligiendo.
 * @param count - Cantidad de opciones comprables del grupo, un entero mayor o igual a 0.
 * @returns La ayuda, por ejemplo "16 mates entre imperiales, torpedos, camioneros y rancheros.".
 * @throws {RangeError} Si `count` no es un entero mayor o igual a 0.
 */
export function stepHint(group: ProductGroup, count: number): string {
  switch (group) {
    case 'mate':
      return `${pluralize(count, 'mate', 'mates')} entre imperiales, torpedos, camioneros y rancheros.`
    case 'bombilla':
      return 'Bombillones de alpaca con picos de bronce.'
    case 'yerba':
      return 'Yerba Canarias en sus tres versiones.'
  }
}

/**
 * Aviso de un paso sin opciones comprables.
 *
 * @param group - Grupo sin opciones.
 * @returns Por ejemplo "No hay yerbas disponibles por ahora".
 */
export function noOptionsText(group: ProductGroup): string {
  return `No hay ${GROUP_PLURAL[group]} disponibles por ahora`
}

/**
 * Texto de lo que falta para completar el kit.
 *
 * @param missing - Grupos sin pieza elegida, en el orden del kit; al menos uno.
 * @returns Por ejemplo "Te falta elegir el mate, la yerba.".
 * @throws {RangeError} Si no falta ningún grupo.
 */
export function missingText(missing: readonly ProductGroup[]): string {
  if (missing.length === 0) {
    throw new RangeError('missingText necesita al menos un grupo que falte.')
  }
  return `Te falta elegir ${missing.map((group) => GROUP_WITH_ARTICLE[group]).join(', ')}.`
}

/**
 * Aviso del panel con una o dos piezas: lo que falta para tener el descuento del kit (Ruling
 * AI-6). Sin descuento configurado (0%) no hay aviso: quien llama lo omite.
 *
 * @param missing - Grupos sin pieza elegida, en el orden del kit; uno o dos.
 * @param percent - Descuento del kit, un entero entre 1 y 100.
 * @returns Por ejemplo "Sumá la bombilla y tenés −10%." o "Sumá la bombilla y la yerba y tenés −10%.".
 * @throws {RangeError} Si no faltan uno o dos grupos, o si el porcentaje no es un entero entre 1 y 100.
 */
export function discountHint(missing: readonly ProductGroup[], percent: number): string {
  if (missing.length < 1 || missing.length > 2) {
    throw new RangeError(
      `El aviso del descuento necesita uno o dos grupos que falten; se recibieron ${String(missing.length)}.`,
    )
  }
  if (percent === 0) throw new RangeError('Sin descuento del kit no hay aviso del descuento.')
  const discount = formatDiscountPercent(percent)
  return `Sumá ${missing.map((group) => GROUP_WITH_ARTICLE[group]).join(' y ')} y tenés ${discount}.`
}

/**
 * Texto del paso Resumen cuando faltan piezas.
 *
 * @param count - Cuántas piezas faltan, un entero entre 1 y 3.
 * @returns "Faltan 3", "Faltan 2" o "Faltan 1" (el diseño no singulariza).
 * @throws {RangeError} Si `count` no es un entero entre 1 y 3.
 */
export function missingCount(count: number): string {
  if (!Number.isInteger(count) || count < 1 || count > 3) {
    throw new RangeError(
      `Las piezas que faltan tienen que ser un entero entre 1 y 3; se recibió ${String(count)}.`,
    )
  }
  return `Faltan ${String(count)}`
}

/**
 * Descripción del descuento del panel, con el signo menos del diseño.
 *
 * @param percent - Descuento del kit, un entero entre 0 y 100.
 * @returns Por ejemplo "Descuento kit −10%".
 * @throws {RangeError} Si el porcentaje no es un entero entre 0 y 100.
 */
export function discountLabel(percent: number): string {
  return `Descuento kit ${formatDiscountPercent(percent)}`
}

/**
 * Frase de la bajada de la página con el descuento del kit. Sin descuento (0%) se omite la frase
 * del descuento, como hacen el inicio, el catálogo y la ficha.
 *
 * @param percent - Descuento del kit, un entero entre 0 y 100.
 * @returns Por ejemplo "Elegí mate, bombilla y yerba. Con las tres piezas, el kit tiene −10% sobre el total."; con 0%, "Elegí mate, bombilla y yerba.".
 * @throws {RangeError} Si el porcentaje no es un entero entre 0 y 100.
 */
export function introText(percent: number): string {
  const base = 'Elegí mate, bombilla y yerba.'
  // `formatDiscountPercent` valida el porcentaje también cuando es 0.
  const discount = formatDiscountPercent(percent)
  return percent === 0
    ? base
    : `${base} Con las tres piezas, el kit tiene ${discount} sobre el total.`
}
