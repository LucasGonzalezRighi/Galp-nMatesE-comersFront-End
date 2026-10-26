import { create } from 'zustand'

/** Cuánto dura a la vista un aviso, en milisegundos (2,8 s, como el diseño). */
export const TOAST_DURATION_MS = 2800

/** Botón de un aviso, por ejemplo "Ver carrito". */
export interface ToastAction {
  /** Texto del botón. */
  label: string
  /** Se llama al tocar el botón; después el aviso se oculta. */
  onClick: () => void
}

/** Contenido de un aviso. */
export interface ToastInput {
  /** Título, por ejemplo "Agregado al carrito". */
  title: string
  /** Texto de apoyo debajo del título, por ejemplo el nombre del producto. */
  subtitle?: string
  /** Botón opcional a la derecha. */
  action?: ToastAction
}

/** Estado del aviso: el último contenido (se conserva al ocultarse, para la salida) y si se ve. */
interface ToastState {
  /** Último aviso mostrado, o `null` si todavía no hubo ninguno. */
  current: ToastInput | null
  /** Si el aviso está a la vista. */
  visible: boolean
  /** Cuántos avisos se mostraron; cambia con cada `showToast`, aunque el texto sea el mismo. */
  serial: number
}

/** Store del aviso. Lo lee `Toaster`; el resto de la tienda usa {@link showToast} y {@link hideToast}. */
export const useToastStore = create<ToastState>(() => ({
  current: null,
  visible: false,
  serial: 0,
}))

/** Temporizador que oculta el aviso; hay uno solo porque se muestra un aviso a la vez. */
let hideTimer: ReturnType<typeof setTimeout> | undefined

/** Cancela el temporizador pendiente, si hay. */
function clearHideTimer(): void {
  if (hideTimer !== undefined) {
    clearTimeout(hideTimer)
    hideTimer = undefined
  }
}

/**
 * Oculta el aviso (por ejemplo, al abrir el carrito). Si no hay uno a la vista, no hace nada.
 */
export function hideToast(): void {
  clearHideTimer()
  if (useToastStore.getState().visible) {
    useToastStore.setState({ visible: false })
  }
}

/**
 * Muestra un aviso abajo y al centro durante {@link TOAST_DURATION_MS}. Un aviso nuevo reemplaza
 * al anterior y reinicia el tiempo.
 *
 * @param input - Título, texto de apoyo y botón opcional.
 * @throws {RangeError} Si el título está vacío o el botón no tiene texto.
 * @example
 * showToast({ title: 'Agregado al carrito', subtitle: product.name })
 */
export function showToast(input: ToastInput): void {
  if (input.title.trim() === '') {
    throw new RangeError('El aviso necesita un título.')
  }
  if (input.action?.label.trim() === '') {
    throw new RangeError('El botón del aviso necesita un texto.')
  }
  clearHideTimer()
  useToastStore.setState((state) => ({ current: input, visible: true, serial: state.serial + 1 }))
  hideTimer = setTimeout(hideToast, TOAST_DURATION_MS)
}

/** Funciones del aviso que devuelve {@link useToast}. */
export interface ToastApi {
  /** Muestra un aviso; ver {@link showToast}. */
  show: (input: ToastInput) => void
  /** Oculta el aviso; ver {@link hideToast}. */
  hide: () => void
}

/** Siempre el mismo objeto: no cambia entre renders, así se puede usar en dependencias de efectos. */
const TOAST_API: ToastApi = { show: showToast, hide: hideToast }

/**
 * Hook para mostrar avisos desde un componente.
 *
 * @returns `{ show, hide }`, estables entre renders.
 * @example
 * const toast = useToast()
 * toast.show({ title: 'Mensaje enviado' })
 */
export function useToast(): ToastApi {
  return TOAST_API
}
