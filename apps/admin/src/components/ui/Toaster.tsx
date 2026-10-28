import type { ReactNode } from 'react'
import { CheckCircleIcon, WarningCircleIcon, XIcon } from '@phosphor-icons/react'
import { Toast } from 'radix-ui'
import { buttonClass } from './button-class'
import { cx } from './cx'
import { OVERLAY_COPY } from './overlay.copy'
import { useToastStore } from './toast'

/** Duración de cada tono en milisegundos. */
const DURATION_MS = { success: 5000, error: 8000 } as const

/**
 * Muestra los avisos de {@link toast} con Radix `Toast`: abajo a la derecha desde 640 px y
 * abajo al centro en el celular. Los de éxito duran 5 s y son un `status`; los de error, 8 s y
 * son un `alert`. Cada uno tiene "Cerrar aviso". Se monta una sola vez, en la raíz de la app
 * (y en los tests que quieren ver avisos). El visor lleva `pointer-events-auto`: con un `Dialog`
 * modal abierto, Radix deja `pointer-events: none` en `body` y sin eso los avisos no se podrían
 * cerrar con el mouse.
 *
 * @example
 * <Toaster />
 */
export function Toaster(): ReactNode {
  const toasts = useToastStore((state) => state.toasts)
  const dismiss = useToastStore((state) => state.dismiss)
  return (
    <Toast.Provider label={OVERLAY_COPY.toastLabel} swipeDirection="right">
      {toasts.map((item) => {
        const isError = item.tone === 'error'
        const Icon = isError ? WarningCircleIcon : CheckCircleIcon
        return (
          <Toast.Root
            key={item.id}
            type={isError ? 'foreground' : 'background'}
            role={isError ? 'alert' : 'status'}
            duration={DURATION_MS[item.tone]}
            onOpenChange={(open) => {
              if (!open) dismiss(item.id)
            }}
            className="bg-surface text-foreground flex items-start gap-3 rounded-lg p-3 pl-4 shadow-md transition-opacity duration-150 ease-out motion-reduce:transition-none starting:opacity-0"
          >
            <Icon
              size={18}
              weight="regular"
              aria-hidden="true"
              className={cx('mt-2 shrink-0', isError ? 'text-danger' : 'text-accent-2-400')}
            />
            <Toast.Description className="flex-1 py-1.5 text-sm">{item.text}</Toast.Description>
            <Toast.Close aria-label={OVERLAY_COPY.closeToast} className={buttonClass('icon', 'md')}>
              <XIcon size={18} weight="regular" aria-hidden="true" />
            </Toast.Close>
          </Toast.Root>
        )
      })}
      <Toast.Viewport
        label={OVERLAY_COPY.toastRegion}
        className="pointer-events-auto fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-md flex-col gap-2 p-4 outline-none sm:right-0 sm:left-auto sm:mx-0"
      />
    </Toast.Provider>
  )
}
