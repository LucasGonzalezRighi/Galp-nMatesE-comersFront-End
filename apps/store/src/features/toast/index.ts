/**
 * Avisos de la tienda (spec 9.5, "Toast"): `showToast` / `useToast().show` desde cualquier parte,
 * y `<Toaster />` montado una vez en el layout.
 *
 * @packageDocumentation
 */
export type { ToastAction, ToastApi, ToastInput } from './toast.store'
export { hideToast, showToast, TOAST_DURATION_MS, useToast } from './toast.store'
export { Toaster } from './Toaster'
