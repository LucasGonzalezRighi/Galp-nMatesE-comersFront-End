/**
 * Carrito de la tienda (spec 9.4 y 9.5): store con `localStorage`, conciliación con el catálogo,
 * panel lateral, botón con contador y vuelo al carrito.
 *
 * Para agregar al carrito desde cualquier pantalla se usan `addProductToCart` y `addKitToCart`
 * (respetan el tope de compra, muestran el aviso y lanzan el vuelo); `openCart` abre el panel y
 * `useCart` lee las líneas. El layout monta `CartHydrator` y `CartDrawer` una sola vez, y el
 * encabezado monta `CartButton`. El checkout concilia con `useCartSync`.
 *
 * Los importes del panel salen de la cotización de la API (`useCartView`). Para el checkout:
 * `buildCartQuoteInput` arma las líneas de `POST /cart/quote` y de `POST /orders` desde el carrito
 * guardado (con el precio esperado de cada línea) y `cartHash` resume su contenido para saber si
 * cambió desde que se creó un pedido.
 *
 * @packageDocumentation
 */
export type { AddKitInput, AddProductInput, AddToCartResult, CartableProduct } from './actions'
export type {
  CartLineIssue,
  CartLineStatus,
  CartLineView,
  CartView,
  CartViewTotals,
} from './cart-view'
export type { CartSnapshot } from './cart.store'
export type { CartViewState } from './use-cart-view'
export type { FlyOrigin } from './fly-to-cart'
export type { CartNotice, ReconcileResult } from './reconcile'
export {
  addKitToCart,
  addProductToCart,
  clearCart,
  closeCart,
  KIT_CART_OPEN_DELAY_MS,
  openCart,
} from './actions'
export { CartButton } from './CartButton'
export { CartDrawer } from './CartDrawer'
export { CartHydrator } from './CartHydrator'
export { buildCartQuoteInput } from './cart-quote-input'
export { useCartQuoteInput } from './use-cart-quote-input'
export { buildCartView } from './cart-view'
export { cartHash } from './cart-hash'
export { useCart } from './cart.store'
export { bumpCartBadge, clickOrigin, flyToCart } from './fly-to-cart'
export { useCartSync } from './use-cart-sync'
export { useCartView } from './use-cart-view'
