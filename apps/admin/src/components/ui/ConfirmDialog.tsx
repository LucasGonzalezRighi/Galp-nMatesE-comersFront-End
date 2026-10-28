import type { ReactNode } from 'react'
import { AlertDialog } from 'radix-ui'
import { useRef } from 'react'
import type { ButtonVariant } from './button-class'
import { Button } from './Button'
import { OVERLAY_COPY } from './overlay.copy'

/** Tono de un diálogo de confirmación: `danger` pinta de rojo el botón de confirmar. */
export type ConfirmDialogTone = 'default' | 'danger'

/** Variante del botón de confirmar de cada tono. */
const CONFIRM_VARIANT: Record<ConfirmDialogTone, ButtonVariant> = {
  default: 'primary',
  danger: 'danger',
}

/** Fondo oscurecido (`background` al 70 %), con el mismo fundido de 150 ms que `Dialog`. */
const OVERLAY_CLASS =
  'fixed inset-0 z-40 bg-background/70 transition-opacity duration-150 ease-out starting:opacity-0 motion-reduce:transition-none'

/** Panel centrado de 400 px: `surface`, `shadow-lg`, `rounded-lg` y alto máximo con scroll. */
const PANEL_CLASS =
  'fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[400px] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-lg bg-surface p-4 text-foreground shadow-lg outline-none transition-opacity duration-150 ease-out starting:opacity-0 motion-reduce:transition-none lg:p-6'

/** Props de {@link ConfirmDialog}. */
export interface ConfirmDialogProps {
  /** Si está abierto (controlado). */
  open: boolean
  /** Se llama al abrir o cerrar ("Cancelar" o Escape). Mientras `isPending`, no se cierra. */
  onOpenChange: (open: boolean) => void
  /** Pregunta o título, por ejemplo "¿Archivar «Mate imperial»?". */
  title: string
  /** Qué pasa si se confirma. */
  description: string
  /** Texto del botón de confirmar, por ejemplo "Archivar". */
  confirmLabel: string
  /** Texto del botón de cancelar. Por omisión "Cancelar". */
  cancelLabel?: string
  /** `danger` para lo destructivo o lo que saca algo de la tienda. */
  tone: ConfirmDialogTone
  /** Mientras se confirma: los dos botones se deshabilitan y el de confirmar muestra un indicador. */
  isPending: boolean
  /** Se llama al confirmar; el diálogo no se cierra solo (lo cierra quien lo usa al terminar). */
  onConfirm: () => void
  /** Error en línea (por ejemplo un `409`), que se muestra con `role="alert"`. */
  children?: ReactNode
}

/**
 * Indica si un contenido de React dibuja algo.
 *
 * @param node - Contenido a revisar.
 * @returns `false` para `null`, `undefined`, booleanos y textos vacíos.
 */
function hasContent(node: ReactNode): boolean {
  return node !== null && node !== undefined && typeof node !== 'boolean' && node !== ''
}

/**
 * Diálogo de confirmación sobre Radix `AlertDialog`, para toda acción irreversible o que saca
 * algo de la tienda. El foco arranca en "Cancelar"; Escape y "Cancelar" lo cierran; confirmar
 * llama a `onConfirm` y deja el diálogo abierto hasta que quien lo usa lo cierre. Al cerrarse, el
 * foco vuelve al elemento que lo tenía al abrirse (si sigue en pantalla).
 *
 * @param props - Ver {@link ConfirmDialogProps}.
 * @throws {RangeError} Si `tone` no es `default` ni `danger`.
 * @example
 * <ConfirmDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="¿Archivar «Mate imperial»?"
 *   description="Deja de verse en la tienda."
 *   confirmLabel="Archivar"
 *   tone="danger"
 *   isPending={archive.isPending}
 *   onConfirm={() => archive.mutate()}
 * />
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = OVERLAY_COPY.cancel,
  tone,
  isPending,
  onConfirm,
  children,
}: ConfirmDialogProps): ReactNode {
  // Sin `Trigger` (el diálogo es controlado), Radix no sabe adónde devolver el foco al cerrar.
  const openerRef = useRef<HTMLElement | null>(null)
  if (!Object.hasOwn(CONFIRM_VARIANT, tone)) {
    throw new RangeError(
      `El tono del diálogo tiene que ser default o danger; se recibió "${tone}".`,
    )
  }
  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!isPending || next) onOpenChange(next)
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={OVERLAY_CLASS} />
        <AlertDialog.Content
          className={PANEL_CLASS}
          onOpenAutoFocus={() => {
            const active = document.activeElement
            openerRef.current = active instanceof HTMLElement ? active : null
          }}
          onCloseAutoFocus={(event) => {
            const opener = openerRef.current
            openerRef.current = null
            if (!opener?.isConnected) return
            event.preventDefault()
            // Un cuadro después: si al cerrarse otro código ya enfocó algo (el h1 de la pantalla
            // nueva al navegar), se respeta; solo se vuelve al que lo tenía si quedó en el body.
            requestAnimationFrame(() => {
              const active = document.activeElement
              if (active === null || active === document.body) opener.focus()
            })
          }}
          onEscapeKeyDown={(event) => {
            if (isPending) event.preventDefault()
          }}
        >
          <div className="flex flex-col gap-1">
            <AlertDialog.Title className="text-h4">{title}</AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-neutral-400">
              {description}
            </AlertDialog.Description>
          </div>
          {hasContent(children) && (
            <div role="alert" className="text-danger text-sm">
              {children}
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" disabled={isPending}>
                {cancelLabel}
              </Button>
            </AlertDialog.Cancel>
            <Button variant={CONFIRM_VARIANT[tone]} isLoading={isPending} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
