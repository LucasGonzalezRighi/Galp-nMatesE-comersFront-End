import type { QueryClient } from '@tanstack/react-query'
import type { ApiClient } from '@galpon/api-client'
import { publicSettingsQuery, shouldRetryQuery } from '@galpon/api-client/react'
import { showToast } from '../toast'
import { cartProductIds } from './cart-lines'
import { describeCartNotices } from './cart-notices'
import { cartProductsKey, fetchCartProducts } from './cart-products'
import { CART_COPY } from './cart.copy'
import { useCartStore } from './cart.store'
import { reconcileCart } from './reconcile'

/** Cuántas veces se repite la conciliación si el cliente cambia el carrito mientras se consulta. */
const MAX_ATTEMPTS = 3

/**
 * Concilia el carrito guardado con el catálogo actual (spec 9.4): trae los productos con
 * `GET /products?ids=`, aplica `reconcileCart`, guarda el resultado y avisa de los cambios con un
 * aviso. Se usa al hidratar, al abrir el panel y al entrar al checkout.
 *
 * Los datos quedan en la caché de TanStack Query con la misma clave que usa el panel, así este
 * lo dibuja sin pedirlos de nuevo. Un error de red o del servidor se reintenta solo (dos veces);
 * si sigue fallando se avisa "No pudimos actualizar el carrito" y el carrito queda como estaba.
 * Si el cliente cambia qué productos hay mientras se consulta, se vuelve a empezar para no
 * quitar una línea nueva por no haberla pedido.
 *
 * @param api - Cliente de la API del navegador.
 * @param queryClient - Caché de TanStack Query.
 */
export async function syncCart(api: ApiClient, queryClient: QueryClient): Promise<void> {
  try {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const requested = cartProductIds(useCartStore.getState().lines)
      if (requested.length === 0) return
      const products = await queryClient.query({
        queryKey: cartProductsKey(requested),
        queryFn: () => fetchCartProducts(api, requested),
        staleTime: 0,
        retry: shouldRetryQuery,
      })
      const hasKit = useCartStore.getState().lines.some((line) => line.type === 'kit')
      const settings = hasKit
        ? await queryClient.query({ ...publicSettingsQuery(api), staleTime: 0 })
        : null

      const { lines, seen, replaceLines } = useCartStore.getState()
      if (cartProductIds(lines).join(',') !== requested.join(',')) continue
      const result = reconcileCart({
        lines,
        products,
        seen,
        kitDiscountPercent: settings?.kitDiscountPercent ?? null,
      })
      replaceLines(result.lines, result.seen)
      const notice = describeCartNotices(result.notices)
      if (notice !== null) showToast(notice)
      return
    }
  } catch {
    showToast({ title: CART_COPY.updateFailed })
  }
}
