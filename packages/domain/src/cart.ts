import type { Leather } from './options'
import { assertValidQuantity, maxQuantity } from './catalog'

/** Cuero elegido de un mate que ofrece cueros; es el `CartItemOptions` del contrato. */
export interface CartLineOptions {
  /** Cuero elegido, uno de los `leathers` del mate. */
  leather: Leather
}

/** Línea del carrito de un producto suelto. Solo los mates que ofrecen cueros llevan `options`. */
export interface ProductCartLine {
  /** Distingue la línea de un producto suelto de la de un kit o un combo. */
  type: 'product'
  /** Id del producto. */
  productId: string
  /** Unidades del producto en esta línea. */
  quantity: number
  /** Cuero elegido; existe solo si el producto ofrece cueros (las bombillas y las yerbas no llevan). */
  options?: CartLineOptions
}

/** Línea del carrito de un kit: un mate, una bombilla y una yerba, con el cuero del mate si ofrece. */
export interface KitCartLine {
  /** Distingue la línea de un kit de la de un producto suelto o un combo. */
  type: 'kit'
  /** Id del mate del kit. */
  mateId: string
  /** Id de la bombilla del kit. */
  bombillaId: string
  /** Id de la yerba del kit. */
  yerbaId: string
  /** Cuero del mate del kit, o `null` si el mate no ofrece cueros. */
  leather: Leather | null
  /** Cantidad de kits (no de piezas): cada kit trae un mate, una bombilla y una yerba. */
  quantity: number
}

/**
 * Línea del carrito de un combo: 2 o 3 productos fijos que arma el dashboard, con precio final.
 * La línea se identifica por el combo y el cuero del mate (ver {@link comboLineKey}); las
 * piezas se guardan solo para contar el stock que usa en el carrito.
 */
export interface ComboCartLine {
  /** Distingue la línea de un combo de la de un producto suelto o un kit. */
  type: 'combo'
  /** Id del combo. */
  comboId: string
  /** Ids de las piezas del combo, en su orden (de 2 a 3), según lo último que informó la API. */
  productIds: readonly string[]
  /** Cuero del mate del combo; existe solo si el combo lleva un mate que ofrece cueros. */
  options?: CartLineOptions
  /** Cantidad de combos (no de piezas): cada combo trae una unidad de cada pieza. */
  quantity: number
}

/** Línea del carrito. Solo guarda ids y cantidades; precios y stock se resuelven aparte. */
export type CartLine = ProductCartLine | KitCartLine | ComboCartLine

/**
 * Deriva la clave de una línea a partir de su contenido (no de la cantidad).
 *
 * Dos líneas con la misma clave son la misma línea: así se suman en vez de repetirse.
 *
 * @param line - Línea del carrito.
 * @returns `product:{id}:{cuero|-}`, `kit:{mate}:{bombilla}:{yerba}:{cuero|-}` o
 *   `combo:{id}:{cuero|-}` (sin las piezas, ver {@link comboLineKey}), con `-` si la línea no trae
 *   cuero. Es la misma que devuelve el back en `CartQuoteLine.key`.
 * @throws {RangeError} Si la línea es de un combo con el id vacío.
 * @example
 * cartLineKey({ type: 'product', productId: 'b1', quantity: 2 }) // "product:b1:-"
 */
export function cartLineKey(line: CartLine): string {
  switch (line.type) {
    case 'kit':
      return `kit:${line.mateId}:${line.bombillaId}:${line.yerbaId}:${line.leather ?? '-'}`
    case 'combo':
      return comboLineKey(line.comboId, line.options ?? null)
    case 'product':
      return `product:${line.productId}:${line.options?.leather ?? '-'}`
  }
}

/**
 * Deriva la clave de una línea de combo, la misma que devuelve el back en `CartQuoteLine.key`.
 *
 * No lleva las piezas: si el dashboard cambia la composición del combo, la línea sigue siendo la
 * misma.
 *
 * @param comboId - Id del combo.
 * @param options - Cuero del mate del combo, o `null` si el combo no lleva un mate con cueros.
 * @returns `combo:{id}:{cuero|-}`.
 * @throws {RangeError} Si el id del combo está vacío.
 * @example
 * comboLineKey('cmb-duo-imperial', { leather: 'Marrón' }) // "combo:cmb-duo-imperial:Marrón"
 * comboLineKey('cmb-bombilla-y-yerba', null) // "combo:cmb-bombilla-y-yerba:-"
 */
export function comboLineKey(comboId: string, options: CartLineOptions | null): string {
  if (comboId.trim() === '') throw new RangeError('El id del combo no puede estar vacío.')
  return `combo:${comboId}:${options?.leather ?? '-'}`
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
 * Suma las líneas sueltas y las piezas de los kits y de los combos (cada kit o combo aporta su
 * cantidad a cada una de sus piezas), porque el tope de compra y el stock valen para el producto en
 * **todas** las líneas.
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
    switch (line.type) {
      case 'kit':
        add(line.mateId, line.quantity)
        add(line.bombillaId, line.quantity)
        add(line.yerbaId, line.quantity)
        break
      case 'combo':
        for (const productId of line.productIds) add(productId, line.quantity)
        break
      case 'product':
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
 * @param lines - Líneas del carrito (se cuentan sueltas y dentro de kits y combos).
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
