import { useSyncExternalStore } from 'react'

/** Consulta de medios con que el sistema pide menos movimiento. */
const REDUCE_QUERY = '(prefers-reduced-motion: reduce)'

/** La lista de medios, o `null` en entornos sin `matchMedia` (por ejemplo, pruebas con jsdom). */
function reduceList(): MediaQueryList | null {
  return typeof window.matchMedia === 'function' ? window.matchMedia(REDUCE_QUERY) : null
}

/** Avisa a React cuando el usuario cambia la preferencia del sistema. */
function subscribe(onChange: () => void): () => void {
  const list = reduceList()
  list?.addEventListener('change', onChange)
  return () => {
    list?.removeEventListener('change', onChange)
  }
}

/** Lee la preferencia actual en el navegador. */
function getSnapshot(): boolean {
  return reduceList()?.matches ?? false
}

/** En el servidor no se conoce la preferencia: se parte de "con movimiento". */
function getServerSnapshot(): boolean {
  return false
}

/**
 * Indica si el usuario pidió menos movimiento (`prefers-reduced-motion: reduce`).
 *
 * A diferencia de `useReducedMotion` de Motion, el primer render de la hidratación coincide con el
 * del servidor (`false`) y recién después se aplica la preferencia real: así no hay diferencias
 * entre el HTML del servidor y el del cliente, y el contenido que el servidor dejó oculto a la
 * espera de una animación se muestra igual cuando el usuario pidió menos movimiento. Responde a
 * los cambios de la preferencia mientras la página está abierta.
 *
 * @returns `true` si hay que mostrar el contenido en su estado final, sin animar.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
