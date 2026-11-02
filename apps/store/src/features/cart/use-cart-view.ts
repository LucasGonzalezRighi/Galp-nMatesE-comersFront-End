'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { cartQuoteQuery, useApiClient } from '@galpon/api-client/react'
import type { CartView } from './cart-view'
import { cartProductIds } from './cart-lines'
import { cartProductsKey, fetchCartProducts } from './cart-products'
import { buildCartQuoteInput } from './cart-quote-input'
import { buildCartView } from './cart-view'
import { useCart } from './cart.store'

/** Lo que devuelve {@link useCartView}. */
export interface CartViewState {
  /** El carrito listo para dibujar; con `loading` en las líneas que la cotización todavía no trae. */
  view: CartView
  /** Si falló la cotización del carrito. */
  isError: boolean
  /**
   * Si lo que se ve es la cotización anterior mientras llega la de las líneas que acaban de
   * cambiar: los importes todavía no son los de este carrito y no hay que finalizar la compra.
   */
  isUpdating: boolean
}

/**
 * Datos del carrito listos para dibujar. Los importes, el ahorro por kit, el "precio sin impuestos
 * nacionales" y los problemas de cada línea salen de una sola cotización con todas las líneas
 * (`POST /cart/quote`) y se combinan con `buildCartView`. El catálogo (`GET /products?ids=`, la
 * misma consulta que usa la conciliación) solo aporta las fotos y el stock compartido entre
 * líneas: si no llega, el panel funciona igual sin fotos.
 *
 * La cotización se pide sin `expectedUnitPriceArs`: el panel solo muestra los precios vigentes y
 * el cambio de precio ya lo avisa la conciliación al abrirlo. El checkout sí los manda
 * (`buildCartQuoteInput` con lo último visto).
 *
 * @param options - `enabled`: si hay que pedir los datos (por ejemplo, solo con el panel abierto).
 *   Con `false` se usa lo que ya haya en la caché.
 */
export function useCartView({ enabled }: { enabled: boolean }): CartViewState {
  const api = useApiClient()
  const { lines, hasHydrated } = useCart()
  const ids = useMemo(() => cartProductIds(lines), [lines])
  const input = useMemo(() => buildCartQuoteInput(lines), [lines])
  const active = enabled && hasHydrated && lines.length > 0
  const quote = useQuery({
    ...cartQuoteQuery(api, input),
    enabled: active,
    // Precio y stock cambian: cada vez que se abre el panel se vuelve a cotizar.
    staleTime: 0,
    placeholderData: keepPreviousData,
  })
  const products = useQuery({
    queryKey: cartProductsKey(ids),
    queryFn: () => fetchCartProducts(api, ids),
    enabled: active,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })
  const view = useMemo(
    () => buildCartView({ lines, quote: quote.data ?? null, products: products.data }),
    [lines, quote.data, products.data],
  )
  return { view, isError: quote.isError, isUpdating: quote.isPlaceholderData }
}
