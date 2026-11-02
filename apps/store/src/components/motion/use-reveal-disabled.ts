'use client'

import { useSyncExternalStore } from 'react'
import { usePrefersReducedMotion } from './use-prefers-reduced-motion'

/** No hay nada que escuchar: la compatibilidad con el navegador no cambia mientras se usa. */
function subscribe(): () => void {
  return () => undefined
}

/** `true` si el navegador puede avisar cuándo un elemento entra en pantalla. */
function getSnapshot(): boolean {
  return typeof IntersectionObserver !== 'undefined'
}

/** En el servidor se arma el HTML como si el navegador fuera compatible. */
function getServerSnapshot(): boolean {
  return true
}

/**
 * Indica si las animaciones que se disparan al entrar en pantalla deben omitirse y mostrar el
 * contenido en su estado final: porque el usuario pidió menos movimiento o porque el navegador no
 * tiene `IntersectionObserver` (en ese caso el contenido quedaría oculto para siempre).
 *
 * Igual que {@link usePrefersReducedMotion}, el primer render de la hidratación coincide con el
 * del servidor.
 *
 * @returns `true` si hay que mostrar el contenido sin animar.
 */
export function useRevealDisabled(): boolean {
  const reduced = usePrefersReducedMotion()
  const canObserve = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return reduced || !canObserve
}
