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
 * URL (§16). Sobrevive a ir al detalle y volver, pero no a recargar la página ni a cerrar la
 * sesión (ver {@link resetOrdersSearch}).
 */
export const useOrdersSearchStore = create<OrdersSearchState>()((set) => ({
  text: '',
  setText: (text) => {
    set({ text })
  },
}))

/**
 * Vacía la búsqueda de pedidos. La llama "Cerrar sesión" (`app/AdminLayout.tsx`): el texto puede
 * tener emails y nombres y no tiene que quedar para quien entre después en la misma pestaña.
 */
export function resetOrdersSearch(): void {
  useOrdersSearchStore.setState({ text: '' })
}
