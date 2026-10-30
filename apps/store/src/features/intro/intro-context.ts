'use client'

import type { MouseEvent } from 'react'
import { createContext, useContext } from 'react'

/** Lo que el proveedor de la transición ofrece a los links del menú y al inicio. */
export interface PageTransitionApi {
  /**
   * Manejador del clic en un link del menú: si corresponde, cancela la navegación del link, baja
   * el telón y navega con la pantalla tapada. No hace nada (el link navega como siempre) con un
   * clic modificado o del medio, si el link es la página actual o con menos movimiento.
   */
  onNavClick: (event: MouseEvent<HTMLAnchorElement>, href: string) => void
  /** Arranca la intro del inicio (la llama el inicio al montarse). */
  startIntro: () => void
  /** Corta la intro del inicio si todavía no se está abriendo (al desmontarse el inicio). */
  stopIntro: () => void
}

/** Contexto del proveedor; `null` fuera de él (los links navegan sin telón). */
export const PageTransitionContext = createContext<PageTransitionApi | null>(null)

/**
 * La transición entre páginas del proveedor más cercano.
 *
 * @returns La API del proveedor, o `null` si no hay uno (por ejemplo, en una prueba aislada).
 */
export function usePageTransition(): PageTransitionApi | null {
  return useContext(PageTransitionContext)
}
