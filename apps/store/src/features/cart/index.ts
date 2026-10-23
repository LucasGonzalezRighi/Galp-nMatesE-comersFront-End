/**
 * Carrito de la tienda (spec 9.4 y 9.5): store con `localStorage`, conciliación con el catálogo,
 * panel lateral, botón con contador y vuelo al carrito.
 *
 * Para agregar al carrito desde cualquier pantalla se usan `addProductToCart` y `addKitToCart`
 * (respetan el tope de compra, muestran el aviso y lanzan el vuelo); `openCart` abre el panel y
 * `useCart` lee las líneas. El layout monta `CartHydrator` y `CartDrawer` una sola vez, y el
 * encabezado monta `CartButton`. El checkout concilia con `useCartSync`.
 *
 * @packageDocumentation
 */
export type { AddKitInput, AddProductInput, AddToCartResult, CartableProduct } from './actions'
export type { CartView, CartLineView, CartLineStatus } from './cart-view'
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
export { buildCartView } from './cart-view'
export { useCart } from './cart.store'
export { bumpCartBadge, clickOrigin, flyToCart } from './fly-to-cart'
export { useCartSync } from './use-cart-sync'
export { useCartView } from './use-cart-view'
