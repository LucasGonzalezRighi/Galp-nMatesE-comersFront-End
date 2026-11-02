import type { Ferrule, Leather } from './options'
import { assertValidQuantity, maxQuantity } from './catalog'

/** Línea del carrito de un producto suelto. Solo los mates llevan `options`. */
export interface ProductCartLine {
  /** Distingue la línea de un producto suelto de la de un kit. */
  type: 'product'
  /** Id del producto. */
  productId: string
  /** Unidades del producto en esta línea. */
  quantity: number
  /** Cuero y virola elegidos; existe solo para los mates (las bombillas y las yerbas no llevan). */
  options?: { leather: Leather; ferrule: Ferrule }
}

/** Línea del carrito de un kit: un mate, una bombilla y una yerba con un cuero. */
export interface KitCartLine {
  /** Distingue la línea de un kit de la de un producto suelto. */
  type: 'kit'
  /** Id del mate del kit. */
  mateId: string
  /** Id de la bombilla del kit. */
  bombillaId: string
  /** Id de la yerba del kit. */
  yerbaId: string
  /** Cuero del mate del kit. */
  leather: Leather
  /** Cantidad de kits (no de piezas): cada kit trae un mate, una bombilla y una yerba. */
  quantity: number
}

/** Línea del carrito. Solo guarda ids y cantidades; precios y stock se resuelven aparte. */
export type CartLine = ProductCartLine | KitCartLine

/**
 * Deriva la clave de una línea a partir de su contenido (no de la cantidad).
 *
 * Dos líneas con la misma clave son la misma línea: así se suman en vez de repetirse.
 *
 * @param line - Línea del carrito.
 * @returns `product:{id}:{cuero|-}:{virola|-}` o `kit:{mate}:{bombilla}:{yerba}:{cuero}`.
 * @example
 * cartLineKey({ type: 'product', productId: 'b1', quantity: 2 }) // "product:b1:-:-"
 */
export function cartLineKey(line: CartLine): string {
  if (line.type === 'kit') {
    return `kit:${line.mateId}:${line.bombillaId}:${line.yerbaId}:${line.leather}`
  }
  return `product:${line.productId}:${line.options?.leather ?? '-'}:${line.options?.ferrule ?? '-'}`
}

/**
 * Agrega una línea al carrito; si ya hay una con la misma clave, suma las cantidades.
 *
 * @param lines - Líneas actuales (no se modifican).
 * @param line - Línea a agregar; su cantidad tiene que ser un entero mayor o igual a 1.
 * @returns Una lista nueva: la línea existente conserva su lugar y la nueva va al final.
 * @throws {RangeError} Si la cantidad de `line` no es un entero mayor o igual a 1.
 */
export function addCartLine(lines: readonly CartLine[], line: CartLine): CartLine[] {
  assertValidQuantity(line.quantity)
  const key = cartLineKey(line)
  if (!lines.some((existing) => cartLineKey(existing) === key)) {
    return [...lines, line]
  }
  return lines.map((existing) =>
    cartLineKey(existing) === key
      ? { ...existing, quantity: existing.quantity + line.quantity }
      : existing,
  )
}

/**
 * Cambia la cantidad de una línea; con 0 o menos la quita.
 *
 * @param lines - Líneas actuales (no se modifican).
 * @param key - Clave de la línea, según {@link cartLineKey}.
 * @param quantity - Cantidad nueva: un entero, o 0 o menos para quitar la línea.
 * @returns Una lista nueva; si no hay una línea con esa clave, queda igual.
 * @throws {RangeError} Si la cantidad es mayor que 0 y no es un entero (por ejemplo, 1.5 o `NaN`).
 */
export function setCartLineQuantity(
  lines: readonly CartLine[],
  key: string,
  quantity: number,
): CartLine[] {
  if (quantity <= 0) {
    return removeCartLine(lines, key)
  }
  assertValidQuantity(quantity)
  return lines.map((line) => (cartLineKey(line) === key ? { ...line, quantity } : line))
}

/**
 * Quita una línea del carrito.
 *
 * @param lines - Líneas actuales (no se modifican).
 * @param key - Clave de la línea, según {@link cartLineKey}.
 * @returns Una lista nueva sin esa línea.
 */
export function removeCartLine(lines: readonly CartLine[], key: string): CartLine[] {
  return lines.filter((line) => cartLineKey(line) !== key)
}

/**
 * Cuenta cuántas unidades de cada producto hay en el carrito.
 *
 * Suma las líneas sueltas y las piezas de los kits (cada kit aporta su cantidad a sus tres piezas),
 * porque el tope de compra y el stock valen para el producto en **todas** las líneas.
 *
 * @param lines - Líneas del carrito.
 * @returns Unidades por id de producto; los productos que no están no aparecen.
 */
export function quantityByProduct(lines: readonly CartLine[]): ReadonlyMap<string, number> {
  const counts = new Map<string, number>()
  const add = (productId: string, quantity: number): void => {
    counts.set(productId, (counts.get(productId) ?? 0) + quantity)
  }
  for (const line of lines) {
    if (line.type === 'kit') {
      add(line.mateId, line.quantity)
      add(line.bombillaId, line.quantity)
      add(line.yerbaId, line.quantity)
    } else {
      add(line.productId, line.quantity)
    }
  }
  return counts
}

/**
 * Calcula cuántas unidades más de un producto se pueden agregar al carrito.
 *
 * @param productId - Producto a revisar.
 * @param stock - Unidades disponibles del producto.
 * @param lines - Líneas del carrito (se cuentan sueltas y dentro de kits).
 * @returns El tope de compra (`min(20, stock)`) menos lo que ya hay; nunca negativo.
 * @example
 * remainingQuantityFor('m', 50, []) // 20
 */
export function remainingQuantityFor(
  productId: string,
  stock: number,
  lines: readonly CartLine[],
): number {
  const inCart = quantityByProduct(lines).get(productId) ?? 0
  return Math.max(0, maxQuantity(stock) - inCart)
}
