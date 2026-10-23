import { z } from 'zod'
import type { CartLine } from '@galpon/domain'
import { addCartLine, FERRULES, LEATHERS, MAX_QUANTITY_PER_PRODUCT } from '@galpon/domain'

/** Máximo de líneas distintas que se leen de `localStorage`: un carrito real no se acerca. */
export const MAX_CART_LINES = 50

/** Cantidad de una línea: entero de 1 al tope de compra por producto. */
const quantitySchema = z.int().min(1).max(MAX_QUANTITY_PER_PRODUCT)

/** Identificador de producto guardado: texto no vacío y acotado. */
const idSchema = z.string().min(1).max(100)

/** Línea de un producto suelto, como se guarda. */
const productLineSchema = z.object({
  type: z.literal('product'),
  productId: idSchema,
  quantity: quantitySchema,
  options: z.object({ leather: z.enum(LEATHERS), ferrule: z.enum(FERRULES) }).optional(),
})

/** Línea de un kit, como se guarda. */
const kitLineSchema = z.object({
  type: z.literal('kit'),
  mateId: idSchema,
  bombillaId: idSchema,
  yerbaId: idSchema,
  leather: z.enum(LEATHERS),
  quantity: quantitySchema,
})

/** Cualquier línea del carrito, discriminada por `type`. */
const cartLineSchema = z.discriminatedUnion('type', [productLineSchema, kitLineSchema])

/**
 * Lee las líneas del carrito que se guardaron en `localStorage`, que pueden ser viejas, de otra
 * versión o estar corruptas. Las líneas inválidas se descartan una por una (una sola mala no
 * vacía el carrito), las repetidas se suman y se leen como máximo {@link MAX_CART_LINES}.
 *
 * @param value - Lo que había guardado, sin confiar en su forma.
 * @returns Líneas válidas, con la misma forma que `CartLine` de `@galpon/domain`.
 */
export function parseCartLines(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return []
  let lines: CartLine[] = []
  for (const item of value.slice(0, MAX_CART_LINES) as unknown[]) {
    const parsed = cartLineSchema.safeParse(item)
    if (parsed.success) lines = addCartLine(lines, parsed.data)
  }
  return lines
}

/**
 * Ids de los productos que usa una línea: uno si es suelta, tres (mate, bombilla y yerba) si es
 * un kit.
 *
 * @param line - Línea del carrito.
 */
export function lineProductIds(line: CartLine): string[] {
  return line.type === 'kit' ? [line.mateId, line.bombillaId, line.yerbaId] : [line.productId]
}

/**
 * Ids distintos de los productos del carrito, ordenados: sirven de clave de la consulta que trae
 * sus datos, así el mismo carrito siempre usa la misma consulta.
 *
 * @param lines - Líneas del carrito.
 */
export function cartProductIds(lines: readonly CartLine[]): string[] {
  return [...new Set(lines.flatMap(lineProductIds))].sort()
}

/**
 * Cantidad de unidades del carrito (cada kit cuenta como uno), la que muestra el contador.
 *
 * @param lines - Líneas del carrito.
 */
export function cartUnitCount(lines: readonly CartLine[]): number {
  return lines.reduce((total, line) => total + line.quantity, 0)
}
