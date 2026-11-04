import type { CartLineOptions, Leather, ProductGroup } from '@galpon/domain'
import {
  assertValidQuantity,
  COMBO_MAX_ITEMS,
  COMBO_MIN_ITEMS,
  comboHasMate,
  DEFAULT_LEATHER,
  hasDistinctGroups,
  isLeather,
  MAX_KIT_DISCOUNT_PERCENT,
  remainingQuantityFor,
} from '@galpon/domain'
import type { FlyOrigin } from './fly-to-cart'
import { hideToast, showToast } from '../toast'
import { CART_COPY, kitDiscountApplied } from './cart.copy'
import { ensureCartHydrated, useCartStore } from './cart.store'
import { flyToCart } from './fly-to-cart'

/** Cuánto tarda en abrirse el carrito después de agregar un kit, en milisegundos (spec 9.4). */
export const KIT_CART_OPEN_DELAY_MS = 850

/** Lo que necesita el carrito de un producto: se puede pasar un `ProductSummary` o una ficha completa. */
export interface CartableProduct {
  /** Id del producto. */
  id: string
  /** Nombre, para el aviso. */
  name: string
  /** Grupo del producto: solo los mates llevan cuero. */
  group: ProductGroup
  /** Precio de lista, o `null` si es "a consultar". */
  priceArs: number | null
  /** Máximo que se puede pedir de una vez: el menor entre 20 y el stock (0 sin stock). */
  maxQuantity: number
  /** Si se puede agregar al carrito (publicado, con precio y con stock). */
  isPurchasable: boolean
}

/**
 * Resultado de agregar al carrito:
 * - `added`: se agregó (`quantity` es lo que se sumó, que puede ser menos de lo pedido por el tope).
 * - `limit`: no se agregó porque ya está en el carrito todo lo que se puede comprar.
 * - `unavailable`: no se agregó porque no se puede comprar (sin precio o sin stock).
 */
export type AddToCartResult =
  { status: 'added'; quantity: number } | { status: 'limit' } | { status: 'unavailable' }

/** Datos de {@link addProductToCart}. */
export interface AddProductInput {
  /** Producto a agregar. */
  product: CartableProduct
  /** Unidades; por omisión 1. Un entero mayor o igual a 1. */
  quantity?: number
  /** Cuero, solo para mates; por omisión Negro. Se ignora en otros grupos. */
  options?: CartLineOptions
  /** Punto del clic, para el vuelo al carrito (ver `clickOrigin`). Sin él solo rebota el contador. */
  origin?: FlyOrigin
}

/** Datos de {@link addKitToCart}. */
export interface AddKitInput {
  /** Las tres piezas: un mate, una bombilla y una yerba. */
  pieces: { mate: CartableProduct; bombilla: CartableProduct; yerba: CartableProduct }
  /** Cuero del mate del kit. */
  leather: Leather
  /** Descuento actual del kit (para el aviso); un entero entre 0 y 30. */
  discountPercent: number
  /** Punto del clic, para el vuelo al carrito. */
  origin?: FlyOrigin
}

/** Lo que necesita el carrito de una pieza de un combo (un `ComboItem` de la API sirve tal cual). */
export interface CartableComboItem {
  /** Id del producto. */
  productId: string
  /** Grupo del producto: si hay un mate, el combo lleva cuero. */
  group: ProductGroup
  /** Máximo que se puede pedir de la pieza: el menor entre 20 y su stock disponible (0 sin stock). */
  maxQuantity: number
}

/** Lo que necesita el carrito de un combo (un `Combo` de la API sirve tal cual). */
export interface CartableCombo {
  /** Id del combo. */
  id: string
  /** Nombre, para el aviso. */
  name: string
  /** Precio final del combo, que se recuerda para avisar si cambia. */
  priceArs: number
  /** Si se puede agregar al carrito (publicado y con todas sus piezas a la venta y con stock). */
  isPurchasable: boolean
  /** Las piezas, de 2 a 3 y de grupos distintos. */
  items: readonly CartableComboItem[]
}

/** Datos de {@link addComboToCart}. */
export interface AddComboInput {
  /** Combo a agregar. */
  combo: CartableCombo
  /** Cuero del mate del combo; por omisión Negro. Sin mate se ignora. */
  options?: CartLineOptions
  /** Punto del clic, para el vuelo al carrito. */
  origin?: FlyOrigin
}

/** Abre el panel del carrito y oculta el aviso, como hace el diseño. */
export function openCart(): void {
  hideToast()
  ensureCartHydrated()
  useCartStore.getState().setOpen(true)
}

/** Cierra el panel del carrito. */
export function closeCart(): void {
  useCartStore.getState().setOpen(false)
}

/** Vacía el carrito, por ejemplo después de confirmar el pago. */
export function clearCart(): void {
  useCartStore.getState().clear()
}

/** Botón "Ver carrito" de los avisos de agregado. */
const VIEW_CART_ACTION = { label: CART_COPY.viewCart, onClick: openCart }

/** Precio de lista visto de cada producto con precio, por id (para avisar si cambia). */
function priceMap(products: readonly CartableProduct[]): Record<string, number> {
  const prices: Record<string, number> = {}
  for (const product of products) {
    if (product.priceArs !== null) prices[product.id] = product.priceArs
  }
  return prices
}

/** Valida que el id y el nombre del producto no estén vacíos. */
function assertCartable(product: CartableProduct): void {
  if (product.id.trim() === '' || product.name.trim() === '') {
    throw new RangeError('El producto tiene que tener id y nombre.')
  }
}

/**
 * Agrega un producto suelto al carrito (spec 9.4): respeta el tope de compra
 * (`remainingQuantityFor`, contando el producto en todas las líneas, así que un doble clic
 * rápido nunca lo supera), muestra el aviso "Agregado al carrito" con el botón "Ver carrito" y
 * lanza el vuelo al carrito. En los mates usa Negro y Alpaca cincelada si no se piden otras
 * opciones. Es una función común (no un hook): se puede llamar desde cualquier manejador.
 *
 * @param input - Ver {@link AddProductInput}.
 * @returns Qué pasó: ver {@link AddToCartResult}.
 * @throws {RangeError} Si la cantidad no es un entero mayor o igual a 1, si faltan el id o el
 *   nombre del producto, o si el cuero no es de los permitidos.
 * @example
 * addProductToCart({ product, origin: clickOrigin(event) })
 */
export function addProductToCart({
  product,
  quantity = 1,
  options,
  origin,
}: AddProductInput): AddToCartResult {
  assertValidQuantity(quantity)
  assertCartable(product)
  if (options !== undefined && !isLeather(options.leather)) {
    throw new RangeError('El cuero elegido no existe.')
  }
  if (!product.isPurchasable) return { status: 'unavailable' }

  ensureCartHydrated()
  const { lines, addLine } = useCartStore.getState()
  const remaining = remainingQuantityFor(product.id, product.maxQuantity, lines)
  if (remaining < 1) {
    showToast({ title: CART_COPY.limitReached, subtitle: product.name, action: VIEW_CART_ACTION })
    return { status: 'limit' }
  }

  const added = Math.min(quantity, remaining)
  addLine(
    {
      type: 'product',
      productId: product.id,
      quantity: added,
      ...(product.group === 'mate' ? { options: options ?? { leather: DEFAULT_LEATHER } } : null),
    },
    { prices: priceMap([product]) },
  )
  showToast({ title: CART_COPY.added, subtitle: product.name, action: VIEW_CART_ACTION })
  flyToCart(origin)
  return { status: 'added', quantity: added }
}

/**
 * Agrega un kit (un mate, una bombilla y una yerba con un cuero) al carrito. Respeta el tope de compra de cada pieza, muestra el aviso
 * "Kit agregado al carrito · Descuento de N% aplicado", lanza el vuelo y abre el carrito a los
 * 850 ms ({@link KIT_CART_OPEN_DELAY_MS}).
 *
 * @param input - Ver {@link AddKitInput}.
 * @returns Qué pasó: ver {@link AddToCartResult}.
 * @throws {RangeError} Si una pieza no es del grupo que le toca, si el descuento no es un entero
 *   entre 0 y 30, o si el cuero no es de los permitidos.
 */
export function addKitToCart({
  pieces,
  leather,
  discountPercent,
  origin,
}: AddKitInput): AddToCartResult {
  const { mate, bombilla, yerba } = pieces
  const expected: [CartableProduct, ProductGroup][] = [
    [mate, 'mate'],
    [bombilla, 'bombilla'],
    [yerba, 'yerba'],
  ]
  for (const [piece, group] of expected) {
    assertCartable(piece)
    if (piece.group !== group) {
      throw new RangeError(`La pieza "${piece.name}" tiene que ser del grupo ${group}.`)
    }
  }
  if (!isLeather(leather)) throw new RangeError('El cuero elegido no existe.')
  if (
    !Number.isInteger(discountPercent) ||
    discountPercent < 0 ||
    discountPercent > MAX_KIT_DISCOUNT_PERCENT
  ) {
    throw new RangeError(
      `El descuento del kit tiene que ser un entero entre 0 y ${String(MAX_KIT_DISCOUNT_PERCENT)}; se recibió ${String(discountPercent)}.`,
    )
  }
  if (expected.some(([piece]) => !piece.isPurchasable)) return { status: 'unavailable' }

  ensureCartHydrated()
  const { lines, addLine } = useCartStore.getState()
  if (expected.some(([piece]) => remainingQuantityFor(piece.id, piece.maxQuantity, lines) < 1)) {
    showToast({ title: CART_COPY.kitLimitReached, action: VIEW_CART_ACTION })
    return { status: 'limit' }
  }

  addLine(
    {
      type: 'kit',
      mateId: mate.id,
      bombillaId: bombilla.id,
      yerbaId: yerba.id,
      leather,
      quantity: 1,
    },
    {
      prices: priceMap([mate, bombilla, yerba]),
      kitDiscountPercent: discountPercent,
    },
  )
  showToast({
    title: CART_COPY.kitAdded,
    subtitle: kitDiscountApplied(discountPercent),
    action: VIEW_CART_ACTION,
  })
  flyToCart(origin)
  setTimeout(openCart, KIT_CART_OPEN_DELAY_MS)
  return { status: 'added', quantity: 1 }
}

/**
 * Valida el combo y las opciones que pide {@link addComboToCart}.
 *
 * @throws {RangeError} Si faltan el id o el nombre, si no tiene de 2 a 3 piezas de grupos
 *   distintos, si el precio no es un entero mayor a 0 o si el cuero no existe.
 */
function assertComboInput({ combo, options }: AddComboInput): void {
  if (combo.id.trim() === '' || combo.name.trim() === '') {
    throw new RangeError('El combo tiene que tener id y nombre.')
  }
  const groups = combo.items.map((item) => item.group)
  if (groups.length < COMBO_MIN_ITEMS || groups.length > COMBO_MAX_ITEMS) {
    throw new RangeError(
      `El combo "${combo.name}" tiene que tener de ${String(COMBO_MIN_ITEMS)} a ${String(COMBO_MAX_ITEMS)} piezas.`,
    )
  }
  if (!hasDistinctGroups(groups)) {
    throw new RangeError(`Las piezas del combo "${combo.name}" tienen que ser de grupos distintos.`)
  }
  if (!Number.isInteger(combo.priceArs) || combo.priceArs < 1) {
    throw new RangeError(
      `El precio del combo tiene que ser un entero mayor a 0; se recibió ${String(combo.priceArs)}.`,
    )
  }
  if (options !== undefined && !isLeather(options.leather)) {
    throw new RangeError('El cuero elegido no existe.')
  }
}

/**
 * Agrega un combo al carrito (Ruling IC-12): una línea con el combo, sus piezas (para el tope) y,
 * si lleva mate, el cuero (por omisión Negro). Respeta el tope de
 * compra de cada pieza contando todas las líneas (sueltas, kits y otros combos), así un doble clic
 * rápido nunca lo supera; muestra el aviso "Combo agregado al carrito" con el nombre y el botón
 * "Ver carrito" y lanza el vuelo, sin abrir el carrito. Recuerda el precio final del combo para
 * avisar si cambia.
 *
 * @param input - Ver {@link AddComboInput}.
 * @returns Qué pasó: ver {@link AddToCartResult}.
 * @throws {RangeError} Si el combo o las opciones no son válidos (ver los motivos en el mensaje).
 * @example
 * addComboToCart({ combo, options: { leather }, origin: clickOrigin(event) })
 */
export function addComboToCart(input: AddComboInput): AddToCartResult {
  assertComboInput(input)
  const { combo, options, origin } = input
  if (!combo.isPurchasable) return { status: 'unavailable' }

  ensureCartHydrated()
  const { lines, addLine } = useCartStore.getState()
  if (
    combo.items.some((item) => remainingQuantityFor(item.productId, item.maxQuantity, lines) < 1)
  ) {
    showToast({ title: CART_COPY.limitReached, subtitle: combo.name, action: VIEW_CART_ACTION })
    return { status: 'limit' }
  }

  const withMate = comboHasMate(combo.items.map((item) => item.group))
  addLine(
    {
      type: 'combo',
      comboId: combo.id,
      productIds: combo.items.map((item) => item.productId),
      ...(withMate ? { options: options ?? { leather: DEFAULT_LEATHER } } : null),
      quantity: 1,
    },
    { prices: { [combo.id]: combo.priceArs } },
  )
  showToast({ title: CART_COPY.comboAdded, subtitle: combo.name, action: VIEW_CART_ACTION })
  flyToCart(origin)
  return { status: 'added', quantity: 1 }
}
