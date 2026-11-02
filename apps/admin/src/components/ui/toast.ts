import { create } from 'zustand'

/** Tono de un aviso: `success` dura 5 s y es un `status`; `error`, 8 s y es un `alert`. */
export type ToastTone = 'success' | 'error'

/** Un aviso en la cola. */
export interface ToastItem {
  /** Identificador único dentro de la sesión. */
  id: number
  /** Tono del aviso. */
  tone: ToastTone
  /** Texto que se muestra (y se anuncia). */
  text: string
}

/** Estado del store de avisos (ver {@link useToastStore}). */
export interface ToastState {
  /** Avisos visibles, del más viejo al más nuevo. */
  toasts: readonly ToastItem[]
  /** Saca un aviso de la cola (lo usa `Toaster` al cerrarse o vencer). */
  dismiss: (id: number) => void
}

/** Último identificador usado. */
let lastId = 0

/**
 * Store de zustand con los avisos visibles. Lo lee `Toaster`; para mostrar avisos se usa
 * {@link toast}, que funciona también fuera de React (por ejemplo en un `onError`).
 */
export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) }))
  },
}))

/**
 * Agrega un aviso a la cola.
 *
 * @param tone - Tono del aviso.
 * @param text - Texto del aviso.
 * @returns El identificador del aviso.
 * @throws {RangeError} Si el texto está vacío.
 */
function push(tone: ToastTone, text: string): number {
  if (text.trim() === '') {
    throw new RangeError('El texto del aviso no puede estar vacío.')
  }
  lastId += 1
  const item: ToastItem = { id: lastId, tone, text }
  useToastStore.setState((state) => ({ toasts: [...state.toasts, item] }))
  return item.id
}

/**
 * Muestra avisos breves en el `Toaster`. Se puede llamar desde cualquier lado, también fuera
 * de React.
 *
 * @example
 * toast.success('Producto creado.')
 * toast.error(error.message)
 */
export const toast = {
  /**
   * Muestra un aviso de éxito (5 s, `role="status"`).
   *
   * @param text - Texto del aviso, por ejemplo "Cambios guardados.".
   * @returns El identificador del aviso.
   * @throws {RangeError} Si el texto está vacío.
   */
  success(text: string): number {
    return push('success', text)
  },
  /**
   * Muestra un aviso de error (8 s, `role="alert"`).
   *
   * @param text - Texto del aviso, por ejemplo el `message` de un `ApiError`.
   * @returns El identificador del aviso.
   * @throws {RangeError} Si el texto está vacío.
   */
  error(text: string): number {
    return push('error', text)
  },
  /** Saca todos los avisos (por ejemplo al cerrar la sesión o entre tests). */
  dismissAll(): void {
    useToastStore.setState({ toasts: [] })
  },
}
