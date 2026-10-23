'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { publicSettingsQuery, useApiClient } from '@galpon/api-client/react'
import type { CartView } from './cart-view'
import { cartProductIds } from './cart-lines'
import { cartProductsKey, fetchCartProducts } from './cart-products'
import { buildCartView } from './cart-view'
import { useCart } from './cart.store'

/** Lo que devuelve {@link useCartView}. */
export interface CartViewState {
  /** El carrito listo para dibujar; con `loading` en las líneas cuyos datos todavía no llegaron. */
  view: CartView
  /** Si falló traer los datos de los productos o el descuento del kit. */
  isError: boolean
}

/**
 * Datos del carrito listos para dibujar: las líneas guardadas, los productos del catálogo
 * (`GET /products?ids=`) y el descuento del kit (`GET /settings/public`) combinados con
 * `buildCartView`, que calcula los importes con `@galpon/domain`.
 *
 * @param options - `enabled`: si hay que pedir los datos (por ejemplo, solo con el panel abierto).
 *   Con `false` se usa lo que ya haya en la caché.
 */
export function useCartView({ enabled }: { enabled: boolean }): CartViewState {
  const api = useApiClient()
  const { lines, hasHydrated } = useCart()
  const ids = useMemo(() => cartProductIds(lines), [lines])
  const hasKit = lines.some((line) => line.type === 'kit')
  const products = useQuery({
    queryKey: cartProductsKey(ids),
    queryFn: () => fetchCartProducts(api, ids),
    enabled: enabled && hasHydrated && ids.length > 0,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })
  const settings = useQuery({
    ...publicSettingsQuery(api),
    enabled: enabled && hasHydrated && hasKit,
  })
  const view = useMemo(
    () =>
      buildCartView({
        lines,
        products: products.data ?? [],
        kitDiscountPercent: settings.data?.kitDiscountPercent ?? null,
      }),
    [lines, products.data, settings.data?.kitDiscountPercent],
  )
  return { view, isError: products.isError || settings.isError }
}
