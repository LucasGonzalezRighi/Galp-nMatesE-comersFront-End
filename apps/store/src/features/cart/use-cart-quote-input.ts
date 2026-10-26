'use client'

import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { CartQuoteInput } from '@galpon/api-client'
import { buildCartQuoteInput } from './cart-quote-input'
import { useCartStore } from './cart.store'

/**
 * Las líneas del carrito guardado listas para cotizar o crear un pedido (`buildCartQuoteInput`),
 * con el precio que el carrito ya tenía de cada una. Se actualiza cuando cambia el carrito. Hasta
 * que `useCart` informa `hasHydrated` las líneas están vacías: quien cotiza tiene que esperar.
 *
 * @returns El cuerpo de `POST /cart/quote`; con el carrito vacío, `items` queda vacío.
 * @example
 * const input = useCartQuoteInput()
 * const quote = useQuery({ ...cartQuoteQuery(api, input), enabled: hasHydrated && lines.length > 0 })
 */
export function useCartQuoteInput(): CartQuoteInput {
  const { lines, seen } = useCartStore(
    useShallow((state) => ({ lines: state.lines, seen: state.seen })),
  )
  return useMemo(() => buildCartQuoteInput(lines, seen), [lines, seen])
}
