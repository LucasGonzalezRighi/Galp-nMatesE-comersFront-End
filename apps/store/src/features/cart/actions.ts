import type { Ferrule, Leather, ProductGroup } from '@galpon/domain'
import {
  assertValidQuantity,
  DEFAULT_FERRULE,
  DEFAULT_LEATHER,
  isFerrule,
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
  /** Grupo del producto: solo los mates llevan cuero y virola. */
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
  /** Cuero y virola, solo para mates; por omisión Negro y Alpaca cincelada. Se ignoran en otros grupos. */
  options?: { leather: Leather; ferrule: Ferrule }
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
 *   nombre del producto, o si el cuero o la virola no son de los permitidos.
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
  if (options !== undefined && (!isLeather(options.leather) || !isFerrule(options.ferrule))) {
    throw new RangeError('El cuero o la virola elegidos no existen.')
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
      ...(product.group === 'mate'
        ? { options: options ?? { leather: DEFAULT_LEATHER, ferrule: DEFAULT_FERRULE } }
        : null),
    },
    { prices: priceMap([product]) },
  )
  showToast({ title: CART_COPY.added, subtitle: product.name, action: VIEW_CART_ACTION })
  flyToCart(origin)
  return { status: 'added', quantity: added }
}

/**
 * Agrega un kit (un mate, una bombilla y una yerba con un cuero) al carrito: el mate lleva
 * siempre la virola Alpaca cincelada. Respeta el tope de compra de cada pieza, muestra el aviso
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
