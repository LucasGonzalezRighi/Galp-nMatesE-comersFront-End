'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useApiClient } from '@galpon/api-client/react'
import { syncCart } from './cart-sync'

/**
 * Devuelve la función que concilia el carrito con el catálogo (ver `syncCart`). Es estable entre
 * renders. El checkout la llama al entrar, antes de cotizar.
 *
 * @returns Una función que trae los productos del carrito, corrige las líneas y avisa de los cambios.
 * @example
 * const syncCart = useCartSync()
 * useEffect(() => { void syncCart() }, [syncCart])
 */
export function useCartSync(): () => Promise<void> {
  const api = useApiClient()
  const queryClient = useQueryClient()
  return useCallback(() => syncCart(api, queryClient), [api, queryClient])
}
