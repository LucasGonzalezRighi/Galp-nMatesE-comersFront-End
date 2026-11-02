'use client'

import { useSyncExternalStore } from 'react'

/** Desplazamiento a partir del cual se considera que la página bajó, en píxeles (spec 9.5). */
export const SCROLLED_THRESHOLD_PX = 8

/** Escucha el scroll de la ventana. */
function subscribe(onChange: () => void): () => void {
  window.addEventListener('scroll', onChange, { passive: true })
  return () => {
    window.removeEventListener('scroll', onChange)
  }
}

/** Si la página ya bajó más que el umbral. */
function getSnapshot(): boolean {
  return window.scrollY > SCROLLED_THRESHOLD_PX
}

/** En el servidor no hay scroll: se parte de "arriba de todo". */
function getServerSnapshot(): boolean {
  return false
}

/**
 * Indica si la página bajó más de 8 px. Vuelve a dibujar solo cuando cambia de lado del umbral
 * (no en cada cuadro del scroll).
 *
 * @returns `true` pasados los 8 px de scroll.
 */
export function useScrolled(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
