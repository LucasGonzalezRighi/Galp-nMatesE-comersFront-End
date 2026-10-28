import { create } from 'zustand'

/** Estado de la sesión del dashboard que decide si se abre "Tu sesión venció". */
export interface SessionExpiredState {
  /** `true` desde que hay una sesión abierta en esta pestaña hasta que se cierra. */
  hasSession: boolean
  /** `true` mientras la sesión abierta venció y falta volver a entrar (el diálogo está abierto). */
  isExpired: boolean
  /** Marca la sesión abierta y cierra el aviso de vencida (al entrar o volver a entrar). */
  markSessionStarted: () => void
  /** Marca la sesión vencida; sin una sesión abierta no hace nada (un `401` del login no cuenta). */
  markSessionExpired: () => void
  /** Vuelve al estado inicial, al cerrar la sesión. */
  markLoggedOut: () => void
}

/**
 * Store de zustand de la sesión vencida. Lo escriben la caché de la app (un `401` con la sesión
 * abierta), la subida de fotos y la sesión; lo lee `SessionExpiredDialog`. Se puede usar fuera
 * de React con `useSessionExpiredStore.getState()`.
 */
export const useSessionExpiredStore = create<SessionExpiredState>()((set) => ({
  hasSession: false,
  isExpired: false,
  markSessionStarted: () => {
    set({ hasSession: true, isExpired: false })
  },
  markSessionExpired: () => {
    set((state) => (state.hasSession ? { isExpired: true } : state))
  },
  markLoggedOut: () => {
    set({ hasSession: false, isExpired: false })
  },
}))
