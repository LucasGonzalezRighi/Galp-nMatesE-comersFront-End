import { create } from 'zustand'

/** Estado del store de la búsqueda de pedidos (ver {@link useOrdersSearchStore}). */
export interface OrdersSearchState {
  /** Lo que está escrito en "Buscar" (número, email o nombre). */
  text: string
  /** Cambia el texto. */
  setText: (text: string) => void
}

/**
 * Búsqueda de `/pedidos`, en memoria (Ruling P4-7): tiene emails y nombres, así que no va en la
 * URL (§16). Sobrevive a ir al detalle y volver, pero no a recargar la página.
 */
export const useOrdersSearchStore = create<OrdersSearchState>()((set) => ({
  text: '',
  setText: (text) => {
    set({ text })
  },
}))
