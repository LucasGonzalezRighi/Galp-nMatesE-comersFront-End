'use client'

import type { ReactNode } from 'react'
import { useSyncExternalStore } from 'react'

/** No hay nada a qué suscribirse: el año no cambia mientras la página está abierta. */
function subscribeToNothing(): () => void {
  return () => undefined
}

/** El año actual, leído en el navegador. */
function getYear(): string {
  return String(new Date().getFullYear())
}

/** En el servidor no se sabe el año (la página se genera una vez y se sirve por meses): queda vacío. */
function getServerYear(): string {
  return ''
}

/**
 * Año actual del pie ("© 2026 Galpón Mates"). Se calcula en el cliente (spec 9.3): la página se
 * genera de antemano, así que un año escrito en el servidor quedaría viejo. Hasta que carga el
 * navegador no muestra nada, y la hidratación coincide con el HTML del servidor.
 */
export function FooterYear(): ReactNode {
  return useSyncExternalStore(subscribeToNothing, getYear, getServerYear)
}
