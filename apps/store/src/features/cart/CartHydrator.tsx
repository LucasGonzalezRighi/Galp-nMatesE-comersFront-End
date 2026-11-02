'use client'

import { useEffect } from 'react'
import { ensureCartHydrated } from './cart.store'
import { useCartSync } from './use-cart-sync'

/**
 * Lee el carrito de `localStorage` una vez que la página ya se hidrató y lo concilia con el
 * catálogo (spec 9.4). No dibuja nada. Va en el layout, dentro de los proveedores. Hasta que
 * termina, el contador y el panel no se muestran (`hasHydrated`), así no hay errores de hidratación.
 */
export function CartHydrator(): null {
  const syncCart = useCartSync()
  useEffect(() => {
    ensureCartHydrated()
    void syncCart()
  }, [syncCart])
  return null
}
