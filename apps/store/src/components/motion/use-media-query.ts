'use client'

import { useCallback, useSyncExternalStore } from 'react'

/** La lista de medios de la consulta, o `null` en entornos sin `matchMedia` (por ejemplo, jsdom). */
function mediaList(query: string): MediaQueryList | null {
  return typeof window.matchMedia === 'function' ? window.matchMedia(query) : null
}

/** En el servidor no se conoce la ventana: la consulta no se cumple. */
function getServerSnapshot(): boolean {
  return false
}

/**
 * Indica si se cumple una consulta de medios (por ejemplo `(min-width: 1024px)`).
 *
 * Como `usePrefersReducedMotion`, el primer render de la hidratación coincide con el del
 * servidor (`false`) y recién después se aplica el valor real: así el HTML del servidor y el del
 * cliente no difieren. Responde a los cambios mientras la página está abierta.
 *
 * @param query - La consulta de medios, con la sintaxis de CSS.
 * @returns `true` si la consulta se cumple en el navegador; `false` en el servidor y en la hidratación.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void): (() => void) => {
      const list = mediaList(query)
      list?.addEventListener('change', onChange)
      return () => {
        list?.removeEventListener('change', onChange)
      }
    },
    [query],
  )
  const getSnapshot = useCallback((): boolean => mediaList(query)?.matches ?? false, [query])
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
