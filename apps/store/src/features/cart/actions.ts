import type { CartLineOptions, Leather, ProductGroup } from '@galpon/domain'
import {
  assertValidQuantity,
  COMBO_MAX_ITEMS,
  COMBO_MIN_ITEMS,
  comboMateLeathers,
  hasDistinctGroups,
  initialLeather,
  isLeather,
  KIT_GROUP_ORDER,
  MAX_KIT_DISCOUNT_PERCENT,
  remainingQuantityFor,
} from '@galpon/domain'
import type { SkippedReason } from './cart.copy'
import type { FlyOrigin } from './fly-to-cart'
import { hideToast, showToast } from '../toast'
import { CART_COPY, kitDiscountApplied, namesList, pieceSkippedNotice } from './cart.copy'
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
  /** Grupo del producto: el kit lo usa para validar cada pieza. */
  group: ProductGroup
  /** Cueros que ofrece (solo los mates pueden tener); vacío si no lleva cuero. */
  leathers: readonly Leather[]
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
  /**
   * Cuero, uno de los `leathers` del producto; por omisión `initialLeather(product.leathers)`.
   * Se ignora si el producto no ofrece cueros.
   */
  options?: CartLineOptions
  /** Punto del clic, para el vuelo al carrito (ver `clickOrigin`). Sin él solo rebota el contador. */
  origin?: FlyOrigin
}

/** Datos de {@link addKitToCart}. */
export interface AddKitInput {
  /** Las tres piezas: un mate, una bombilla y una yerba. */
  pieces: { mate: CartableProduct; bombilla: CartableProduct; yerba: CartableProduct }
  /**
   * Cuero del mate del kit, uno de sus `leathers` (la pantalla del kit manda
   * `resolveLeather(preferencia, mate.leathers)`); con `null`, `initialLeather(mate.leathers)`. Se
   * ignora (queda `null`) si el mate no ofrece cueros.
   */
  leather: Leather | null
  /** Descuento actual del kit (para el aviso); un entero entre 0 y 30. */
  discountPercent: number
  /** Punto del clic, para el vuelo al carrito. */
  origin?: FlyOrigin
}

/** Datos de {@link addKitPiecesToCart}. */
export interface AddKitPiecesInput {
  /** Las piezas elegidas del kit, una o dos y de grupos distintos (con las tres va el kit). */
  pieces: readonly CartableProduct[]
  /**
   * Cuero del mate, si entre las piezas hay uno, con el mismo criterio que {@link AddKitInput}:
   * uno de sus `leathers`; con `null`, `initialLeather(mate.leathers)`. Se ignora si no hay mate o
   * el mate no ofrece cueros.
   */
  leather: Leather | null
  /** Punto del clic, para el vuelo al carrito. */
  origin?: FlyOrigin
}

/** Lo que necesita el carrito de una pieza de un combo (un `ComboItem` de la API sirve tal cual). */
export interface CartableComboItem {
  /** Id del producto. */
  productId: string
  /** Grupo del producto: si hay un mate que ofrece cueros, el combo lleva cuero. */
  group: ProductGroup
  /** Cueros que ofrece la pieza (solo los mates pueden tener). */
  leathers: readonly Leather[]
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
  /**
   * Cuero del mate del combo, uno de sus `leathers`; por omisión `initialLeather` de esos cueros.
   * Se ignora si el combo no lleva mate o el mate no ofrece cueros (`comboMateLeathers`).
   */
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
 * Decide el cuero de una línea nueva con los cueros que ofrece el mate (Ruling AT-5).
 *
 * @param chosen - Cuero pedido, o `null` si no se pidió ninguno.
 * @param offered - Cueros que ofrece el mate (suelto, del kit o del combo).
 * @param name - Nombre del producto o del combo, para el mensaje del error.
 * @returns `null` si no ofrece cueros (el pedido se ignora); el pedido si lo ofrece; si no se
 *   pidió, `initialLeather(offered)`.
 * @throws {RangeError} Si el cuero pedido no existe o, ofreciendo cueros, no es uno de ellos.
 */
function chooseLeather(
  chosen: Leather | null,
  offered: readonly Leather[],
  name: string,
): Leather | null {
  if (chosen !== null && !isLeather(chosen)) throw new RangeError('El cuero elegido no existe.')
  if (offered.length === 0) return null
  if (chosen === null) return initialLeather(offered)
  if (!offered.includes(chosen)) {
    throw new RangeError(`"${name}" no ofrece el cuero ${chosen}; ofrece ${offered.join(', ')}.`)
  }
  return chosen
}

/**
 * Agrega un producto suelto al carrito (spec 9.4): respeta el tope de compra
 * (`remainingQuantityFor`, contando el producto en todas las líneas, así que un doble clic
 * rápido nunca lo supera), muestra el aviso "Agregado al carrito" con el botón "Ver carrito" y
 * lanza el vuelo al carrito. Si el producto ofrece cueros, la línea lleva el pedido o, si no se
 * pide ninguno, `initialLeather` (Negro si está; si no, el primero); si no ofrece, va sin cuero.
 * Es una función común (no un hook): se puede llamar desde cualquier manejador.
 *
 * @param input - Ver {@link AddProductInput}.
 * @returns Qué pasó: ver {@link AddToCartResult}.
 * @throws {RangeError} Si la cantidad no es un entero mayor o igual a 1, si faltan el id o el
 *   nombre del producto, o si el cuero no existe o el producto no lo ofrece.
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
  const leather = chooseLeather(options?.leather ?? null, product.leathers, product.name)
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
      ...(leather === null ? null : { options: { leather } }),
    },
    { prices: priceMap([product]) },
  )
  showToast({ title: CART_COPY.added, subtitle: product.name, action: VIEW_CART_ACTION })
  flyToCart(origin)
  return { status: 'added', quantity: added }
}

/**
 * Agrega un kit (un mate, una bombilla y una yerba, con el cuero del mate si ofrece) al carrito.
 * Respeta el tope de compra de cada pieza, muestra el aviso
 * "Kit agregado al carrito · Descuento de N% aplicado", lanza el vuelo y abre el carrito a los
 * 850 ms ({@link KIT_CART_OPEN_DELAY_MS}).
 *
 * @param input - Ver {@link AddKitInput}.
 * @returns Qué pasó: ver {@link AddToCartResult}.
 * @throws {RangeError} Si una pieza no es del grupo que le toca, si el descuento no es un entero
 *   entre 0 y 30, o si el cuero no existe o el mate no lo ofrece.
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
  const mateLeather = chooseLeather(leather, mate.leathers, mate.name)
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
      leather: mateLeather,
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
 * Valida las piezas que pide {@link addKitPiecesToCart} y decide el cuero del mate.
 *
 * @returns El cuero del mate, o `null` si no hay mate o no ofrece cueros.
 * @throws {RangeError} Si no son una o dos piezas de grupos distintos, si a alguna le faltan el id
 *   o el nombre, o si el cuero no existe o el mate no lo ofrece.
 */
function checkKitPieces({ pieces, leather }: AddKitPiecesInput): Leather | null {
  if (pieces.length < 1 || pieces.length >= KIT_GROUP_ORDER.length) {
    throw new RangeError(
      `Las piezas sueltas del kit tienen que ser de 1 a ${String(KIT_GROUP_ORDER.length - 1)}; con las tres se agrega el kit.`,
    )
  }
  if (!hasDistinctGroups(pieces.map((piece) => piece.group))) {
    throw new RangeError('Las piezas del kit tienen que ser de grupos distintos.')
  }
  pieces.forEach(assertCartable)
  const mate = pieces.find((piece) => piece.group === 'mate')
  return chooseLeather(leather, mate?.leathers ?? [], mate?.name ?? '')
}

/**
 * Agrega el kit con una o dos piezas (Ruling AI-6): cada pieza va como un producto suelto, a
 * precio de lista y sin el descuento del kit, y el mate con su cuero (el mismo criterio que
 * {@link addKitToCart}). Respeta el tope de compra de cada pieza contando todas sus líneas, así que
 * volver a agregar suma cantidades como un producto suelto. Si una pieza no se puede sumar (tope o
 * sin stock) agrega las otras y lo dice en el aviso. Muestra un solo aviso y lanza un solo vuelo; si
 * entraron todas, abre el carrito a los 850 ms como el kit ({@link KIT_CART_OPEN_DELAY_MS}); si
 * alguna quedó afuera no lo abre, así el aviso se puede leer.
 *
 * @param input - Ver {@link AddKitPiecesInput}.
 * @returns Qué pasó: ver {@link AddToCartResult}; en `added`, `quantity` es cuántas piezas entraron.
 * @throws {RangeError} Si no son una o dos piezas de grupos distintos, si a alguna le faltan el id
 *   o el nombre, o si el cuero no existe o el mate no lo ofrece.
 * @example
 * addKitPiecesToCart({ pieces: [mate, yerba], leather: 'Negro', origin: clickOrigin(event) })
 */
export function addKitPiecesToCart(input: AddKitPiecesInput): AddToCartResult {
  const mateLeather = checkKitPieces(input)
  const { pieces, origin } = input
  if (pieces.every((piece) => !piece.isPurchasable)) return { status: 'unavailable' }

  ensureCartHydrated()
  const { lines, addLine } = useCartStore.getState()
  const added: string[] = []
  const skipped: { name: string; reason: SkippedReason }[] = []
  for (const piece of pieces) {
    if (!piece.isPurchasable) {
      skipped.push({ name: piece.name, reason: 'unavailable' })
    } else if (remainingQuantityFor(piece.id, piece.maxQuantity, lines) < 1) {
      skipped.push({ name: piece.name, reason: 'limit' })
    } else {
      // Las piezas son de grupos distintos: ninguna cambia el tope de otra.
      const leather = piece.group === 'mate' ? mateLeather : null
      addLine(
        {
          type: 'product',
          productId: piece.id,
          quantity: 1,
          ...(leather === null ? null : { options: { leather } }),
        },
        { prices: priceMap([piece]) },
      )
      added.push(piece.name)
    }
  }

  if (added.length === 0) {
    const limited = skipped.filter((piece) => piece.reason === 'limit').map((piece) => piece.name)
    showToast({
      title: CART_COPY.limitReached,
      subtitle: namesList(limited),
      action: VIEW_CART_ACTION,
    })
    return { status: 'limit' }
  }
  const [firstSkipped] = skipped
  showToast({
    title: CART_COPY.added,
    subtitle:
      firstSkipped === undefined
        ? namesList(added)
        : pieceSkippedNotice(firstSkipped.name, firstSkipped.reason),
    action: VIEW_CART_ACTION,
  })
  flyToCart(origin)
  if (firstSkipped === undefined) setTimeout(openCart, KIT_CART_OPEN_DELAY_MS)
  return { status: 'added', quantity: added.length }
}

/**
 * Valida el combo que pide {@link addComboToCart} y decide su cuero.
 *
 * @returns El cuero de la línea, o `null` si el combo no lleva un mate que ofrezca cueros.
 * @throws {RangeError} Si faltan el id o el nombre, si no tiene de 2 a 3 piezas de grupos
 *   distintos, si el precio no es un entero mayor a 0 o si el cuero no existe o el mate no lo
 *   ofrece.
 */
function checkComboInput({ combo, options }: AddComboInput): Leather | null {
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
  return chooseLeather(options?.leather ?? null, comboMateLeathers(combo.items), combo.name)
}

/**
 * Agrega un combo al carrito (Ruling IC-12): una línea con el combo, sus piezas (para el tope) y,
 * si el mate del combo ofrece cueros, el cuero (por omisión `initialLeather`). Respeta el tope de
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
  const leather = checkComboInput(input)
  const { combo, origin } = input
  if (!combo.isPurchasable) return { status: 'unavailable' }

  ensureCartHydrated()
  const { lines, addLine } = useCartStore.getState()
  if (
    combo.items.some((item) => remainingQuantityFor(item.productId, item.maxQuantity, lines) < 1)
  ) {
    showToast({ title: CART_COPY.limitReached, subtitle: combo.name, action: VIEW_CART_ACTION })
    return { status: 'limit' }
  }

  addLine(
    {
      type: 'combo',
      comboId: combo.id,
      productIds: combo.items.map((item) => item.productId),
      ...(leather === null ? null : { options: { leather } }),
      quantity: 1,
    },
    { prices: { [combo.id]: combo.priceArs } },
  )
  showToast({ title: CART_COPY.comboAdded, subtitle: combo.name, action: VIEW_CART_ACTION })
  flyToCart(origin)
  return { status: 'added', quantity: 1 }
}
