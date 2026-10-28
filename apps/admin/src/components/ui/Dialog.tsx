import type { ReactNode } from 'react'
import { XIcon } from '@phosphor-icons/react'
import { Dialog as RadixDialog } from 'radix-ui'
import { buttonClass } from './button-class'
import { cx } from './cx'
import { OVERLAY_COPY } from './overlay.copy'

/** Ancho máximo de un diálogo: `sm` 400 px, `md` 560 px y `lg` 720 px. */
export type DialogSize = 'sm' | 'md' | 'lg'

/** Clases del ancho máximo de cada tamaño. */
const SIZE_CLASSES: Record<DialogSize, string> = {
  sm: 'max-w-[400px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[720px]',
}

/**
 * Fondo oscurecido de los diálogos (`background` al 70 %), con un fundido de entrada de 150 ms.
 * Lo comparte `ConfirmDialog` por medio de las mismas clases.
 */
const OVERLAY_CLASS =
  'fixed inset-0 z-40 bg-background/70 transition-opacity duration-150 ease-out starting:opacity-0 motion-reduce:transition-none'

/** Panel centrado: `surface`, `shadow-lg`, `rounded-lg`, alto máximo y fundido de entrada. */
const PANEL_CLASS =
  'fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg bg-surface text-foreground shadow-lg outline-none transition-opacity duration-150 ease-out starting:opacity-0 motion-reduce:transition-none'

/** Props de {@link Dialog}. */
export interface DialogProps {
  /** Si está abierto (controlado). */
  open: boolean
  /** Se llama al abrir o cerrar (Escape, tocar afuera o "Cerrar"). */
  onOpenChange: (open: boolean) => void
  /** Título del diálogo (`h2`); es su nombre accesible. */
  title: string
  /** Texto debajo del título; es su descripción accesible. */
  description?: string
  /** Contenido, con scroll interno si no entra. */
  children: ReactNode
  /** Botones del pie, alineados a la derecha (por ejemplo "Cancelar" y "Guardar"). */
  footer?: ReactNode
  /** Ancho máximo: `sm` 400 px, `md` 560 px (por omisión) o `lg` 720 px. */
  size?: DialogSize
}

/**
 * Diálogo modal sobre Radix `Dialog`: trampa de foco, Escape y tocar afuera lo cierran, y el
 * botón "Cerrar" se ve arriba a la derecha. Si el contenido no entra, el cuerpo hace scroll y el
 * título y el pie quedan fijos.
 *
 * "Cerrar" va último en el DOM (después del cuerpo y del pie, ubicado con CSS): así el foco
 * inicial de Radix cae en el primer elemento enfocable del cuerpo (el primer campo de un
 * formulario) o, si no hay, en el pie, y no en la X.
 *
 * @param props - Ver {@link DialogProps}.
 * @throws {RangeError} Si `size` no es `sm`, `md` ni `lg`.
 * @example
 * <Dialog open={open} onOpenChange={setOpen} title="Nueva línea" footer={<Button>Guardar</Button>}>
 *   <CategoryFields />
 * </Dialog>
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
}: DialogProps): ReactNode {
  if (!Object.hasOwn(SIZE_CLASSES, size)) {
    throw new RangeError(`El tamaño del diálogo tiene que ser sm, md o lg; se recibió "${size}".`)
  }
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={OVERLAY_CLASS} />
        <RadixDialog.Content
          className={cx(PANEL_CLASS, SIZE_CLASSES[size])}
          {...(description === undefined ? { 'aria-describedby': undefined } : {})}
        >
          <div className="flex items-start gap-4 p-4 pr-17 pb-2 lg:px-6 lg:pt-6 lg:pr-19">
            <div className="flex flex-1 flex-col gap-1 pt-1.5">
              <RadixDialog.Title className="text-h4">{title}</RadixDialog.Title>
              {description !== undefined && (
                <RadixDialog.Description className="text-sm text-neutral-400">
                  {description}
                </RadixDialog.Description>
              )}
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-2 lg:px-6">
            {children}
          </div>
          {footer !== undefined && (
            <div className="border-divider flex flex-wrap justify-end gap-2 border-t p-4 lg:px-6">
              {footer}
            </div>
          )}
          <RadixDialog.Close
            aria-label={OVERLAY_COPY.close}
            className={cx(buttonClass('icon', 'md'), 'absolute top-4 right-4 lg:top-6 lg:right-6')}
          >
            <XIcon size={18} weight="regular" aria-hidden="true" />
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
