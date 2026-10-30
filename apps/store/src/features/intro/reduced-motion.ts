/** Consulta de medios con que el sistema pide menos movimiento. */
const REDUCE_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Lee en el momento si el usuario pidió menos movimiento. A diferencia del hook
 * `usePrefersReducedMotion`, que en la hidratación arranca en `false`, sirve para decidir en un
 * efecto o en un clic sin esperar otro render.
 *
 * @returns `true` con `prefers-reduced-motion: reduce`; `false` sin `matchMedia` (jsdom sin simular).
 */
export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(REDUCE_QUERY).matches
}
