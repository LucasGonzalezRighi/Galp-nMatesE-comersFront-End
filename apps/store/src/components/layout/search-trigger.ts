'use client'

import { useSyncExternalStore } from 'react'

/** Si el buscador está abierto. */
let isOpen = false

/** Quienes escuchan cambios (los componentes que usan {@link useSearchOpen}). */
const listeners = new Set<() => void>()

/** Cambia el estado y avisa a los oyentes, solo si cambió. */
function setOpen(open: boolean): void {
  if (isOpen === open) return
  isOpen = open
  for (const listener of listeners) listener()
}

/** Suscribe un oyente; devuelve la función que lo da de baja. */
function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Pide abrir el buscador. El encabezado la llama al tocar la lupa; el modal de búsqueda (feature
 * `search`) escucha con {@link useSearchOpen}. Es un store mínimo para que el layout no dependa de
 * esa feature (ruling P2-1).
 */
export function openSearch(): void {
  setOpen(true)
}

/** Cierra el buscador. La llama el modal de búsqueda al cerrarse (Escape, clic afuera o al elegir un resultado). */
export function closeSearch(): void {
  setOpen(false)
}

/**
 * Indica si hay que mostrar el buscador. Lo usa el modal de búsqueda para saber cuándo abrirse.
 *
 * @returns `true` desde que se llama a {@link openSearch} hasta {@link closeSearch}.
 */
export function useSearchOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isOpen,
    () => false,
  )
}
