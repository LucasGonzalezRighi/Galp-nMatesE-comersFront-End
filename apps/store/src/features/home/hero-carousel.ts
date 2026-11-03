import type { ProductSummary } from '@galpon/api-client'
import type { ProductGroup } from '@galpon/domain'
import type { StoryProducts } from './story-products'
import { HOME_COPY, orderLabel } from './home.copy'

/** Cuántas piezas muestra la portada del v4 (Ruling IC-7). */
export const HERO_SLIDE_COUNT = 5

/**
 * Cómo se ve una tarjeta de la pila según su distancia a la actual: corrimiento (en % de su propio
 * tamaño), escala, giro sobre el eje vertical (grados), opacidad y orden de apilado (`z-index`).
 */
export interface StackLook {
  /** Corrimiento horizontal, en % del ancho de la tarjeta. */
  x: number
  /** Corrimiento vertical, en % del alto de la tarjeta. */
  y: number
  /** Escala. */
  scale: number
  /** Giro sobre el eje vertical, en grados (0 en la pila plana). */
  rotateY: number
  /** Opacidad, de 0 a 1. */
  opacity: number
  /** Orden de apilado: la que sale va por delante de todas. */
  z: number
}

/** Posiciones del v4 con giro, por distancia a la actual (0, 1, 2 y de 3 en adelante). */
const TILTED: readonly StackLook[] = [
  { x: 0, y: 0, scale: 1, rotateY: 0, opacity: 1, z: 5 },
  { x: 34, y: 4, scale: 0.84, rotateY: -16, opacity: 0.6, z: 4 },
  { x: 58, y: 8, scale: 0.7, rotateY: -24, opacity: 0.28, z: 3 },
  { x: 76, y: 10, scale: 0.6, rotateY: -28, opacity: 0, z: 2 },
]

/** Las mismas posiciones en la pila plana del celular (research-design §10): sin giro. */
const FLAT: readonly StackLook[] = [
  { x: 0, y: 0, scale: 1, rotateY: 0, opacity: 1, z: 5 },
  { x: 30, y: 4, scale: 0.86, rotateY: 0, opacity: 0.6, z: 4 },
  { x: 52, y: 8, scale: 0.74, rotateY: 0, opacity: 0.28, z: 3 },
  { x: 70, y: 10, scale: 0.64, rotateY: 0, opacity: 0, z: 2 },
]

/** La que acaba de salir pasa por delante hacia la izquierda, agrandándose y apagándose. */
const LEAVING_TILTED: StackLook = { x: -18, y: 0, scale: 1.04, rotateY: 10, opacity: 0, z: 6 }
const LEAVING_FLAT: StackLook = { ...LEAVING_TILTED, rotateY: 0 }

/** Valida una posición dentro de una lista de `count` elementos (`count` entero mayor o igual a 1). */
function assertPosition(what: string, position: number, count: number): void {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError(
      `La cantidad de piezas tiene que ser un entero mayor o igual a 1; se recibió ${String(count)}.`,
    )
  }
  if (!Number.isInteger(position) || position < 0 || position >= count) {
    throw new RangeError(
      `${what} tiene que ser un entero de 0 a ${String(count - 1)}; se recibió ${String(position)}.`,
    )
  }
}

/**
 * Las piezas de la portada del v4 (Ruling IC-7): el mate de la portada, la primera bombilla, la
 * primera yerba, el primer mate destacado que no es el de la portada y la segunda bombilla, sin
 * repetir; si faltan, se completa con los destacados en su orden hasta {@link HERO_SLIDE_COUNT}.
 *
 * @param story - Los productos de la historia, ya resueltos (`resolveStoryProducts`).
 * @param featured - Los destacados, en el orden del listado.
 * @returns Hasta cinco piezas, sin repetidos (menos si el catálogo no alcanza).
 */
export function heroSlides(
  story: StoryProducts,
  featured: readonly ProductSummary[],
): ProductSummary[] {
  const otherMate = featured.find(
    (product) => product.group === 'mate' && product.id !== story.hero?.id,
  )
  const candidates = [
    story.hero,
    story.bombillas[0],
    story.yerbas[0],
    otherMate,
    story.bombillas[1],
    ...featured,
  ]
  const slides: ProductSummary[] = []
  for (const product of candidates) {
    if (slides.length === HERO_SLIDE_COUNT) break
    if (product === null || product === undefined) continue
    if (slides.some((slide) => slide.id === product.id)) continue
    slides.push(product)
  }
  return slides
}

/**
 * La palabra gigante de contorno detrás de la pila, según el grupo de la pieza actual.
 *
 * @param group - Grupo de la pieza.
 * @returns `Mates`, `Bombillas` o `Yerba`.
 * @throws {RangeError} Si el grupo no existe.
 */
export function heroWord(group: ProductGroup): string {
  const words: Readonly<Record<string, string>> = HOME_COPY.heroCarousel.words
  const word = Object.hasOwn(words, group) ? words[group] : undefined
  if (word === undefined) {
    throw new RangeError(`El grupo de producto no existe; se recibió ${group}.`)
  }
  return word
}

/**
 * El contador de la fila de controles.
 *
 * @param index - Posición de la pieza actual, desde 0.
 * @param count - Cantidad de piezas, un entero mayor o igual a 1.
 * @returns Por ejemplo `02 — 05` para la segunda de cinco.
 * @throws {RangeError} Si `count` no es un entero mayor o igual a 1 o `index` no es un entero de 0 a `count − 1`.
 */
export function heroCounter(index: number, count: number): string {
  assertPosition('La posición de la pieza', index, count)
  return `${orderLabel(index + 1)} — ${orderLabel(count)}`
}

/**
 * Cómo se ve una tarjeta de la pila: la actual al frente, las dos siguientes asomando a la derecha
 * (más chicas y tenues), las demás escondidas detrás y la anterior (la que acaba de salir) por
 * delante, apagada. Con `flat` (celular) solo se corre y se achica; con giro es la tabla del v4.
 *
 * @param distance - Distancia a la actual, hacia adelante y dando la vuelta: `(posición − actual + count) % count`.
 * @param count - Cantidad de tarjetas, un entero mayor o igual a 1.
 * @param flat - `true` para la pila plana del celular (sin `rotateY`).
 * @returns Ver {@link StackLook}.
 * @throws {RangeError} Si `count` no es un entero mayor o igual a 1 o `distance` no es un entero de 0 a `count − 1`.
 */
export function stackLook(distance: number, count: number, flat: boolean): StackLook {
  assertPosition('La distancia a la pieza actual', distance, count)
  if (count > 2 && distance === count - 1) return flat ? LEAVING_FLAT : LEAVING_TILTED
  const table = flat ? FLAT : TILTED
  const look = table[Math.min(distance, table.length - 1)]
  if (look === undefined) throw new RangeError('La tabla de la pila está vacía.')
  return look
}
