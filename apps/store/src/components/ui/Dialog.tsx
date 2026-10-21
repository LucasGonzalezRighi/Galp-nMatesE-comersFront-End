'use client'

import type { ReactNode, RefObject } from 'react'
import { useEffect, useId, useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { cx } from './cx'

/**
 * Dónde se ubica el panel del diálogo en la pantalla:
 * - `center`: tarjeta centrada de 440 px (confirmaciones, verificación del banco).
 * - `top`: capa arriba y centrada, de 720 px y sin tarjeta (el buscador).
 * - `end`: panel pegado al borde derecho y a toda la altura (el carrito).
 * - `full`: panel que cubre toda la pantalla (el menú del celular).
 */
export type DialogPlacement = 'center' | 'top' | 'end' | 'full'

/** Props de {@link Dialog}. */
export interface DialogProps {
  /** Si el diálogo está abierto. Cerrado no renderiza nada. */
  open: boolean
  /** Se llama al pedir el cierre (Escape o clic en el fondo, si `dismissible`). */
  onClose: () => void
  /** Título del diálogo; es su nombre accesible. */
  title: string
  /** Muestra el título solo para lectores de pantalla (por ejemplo, en un buscador). */
  hideTitle?: boolean
  /** Texto descriptivo bajo el título; se vincula con `aria-describedby`. */
  description?: ReactNode
  /** Contenido del diálogo: cuerpo y acciones. */
  children?: ReactNode
  /** Si Escape y el clic en el fondo cierran el diálogo. Por defecto sí. */
  dismissible?: boolean
  /** Elemento que recibe el foco al abrir. Por defecto, el primero que se pueda enfocar. */
  initialFocusRef?: RefObject<HTMLElement | null>
  /** Dónde se ubica el panel y qué fondo lleva por defecto. Por defecto, `center`. */
  placement?: DialogPlacement
  /**
   * Quita al panel lo que trae por defecto (fondo, bordes redondeados, sombra, espacios y ancho);
   * solo conserva lo necesario para el foco. Así `className` es todo su aspecto y no compite con
   * clases de Tailwind que traería el panel.
   */
  unstyled?: boolean
  /**
   * Clases del panel. Se suman a las del panel, salvo con `unstyled`, donde son las únicas: el
   * componente no resuelve conflictos entre utilidades, así que para cambiar fondo, sombra o
   * ancho conviene usar `unstyled` en lugar de repetir la propiedad.
   */
  className?: string
  /** Clases del fondo oscuro; reemplazan a las del fondo por defecto de `placement`. */
  backdropClassName?: string
}

/** Clases del contenedor que ocupa toda la pantalla, según dónde va el panel. */
const CONTAINER_CLASSES: Record<DialogPlacement, string> = {
  center: 'grid place-items-center p-(--space-4)',
  top: 'flex items-start justify-center px-5 pb-5 pt-[10vh]',
  end: 'flex justify-end',
  full: 'flex',
}

/** Fondo por defecto de cada ubicación: el buscador y el menú desenfocan la página, como el diseño. */
const BACKDROP_CLASSES: Record<DialogPlacement, string> = {
  center: 'bg-neutral-900/50',
  top: 'bg-background/84 backdrop-blur-[18px]',
  end: 'bg-neutral-900/60 backdrop-blur-[4px]',
  full: 'bg-background/94 backdrop-blur-[18px]',
}

/** Clases del panel que no son de aspecto: la posición sobre el fondo y el contorno del foco. */
const PANEL_BASE_CLASSES = 'relative focus:outline-none'

/** Aspecto por defecto del panel de cada ubicación (la tarjeta solo existe en `center`). */
const PANEL_CLASSES: Record<DialogPlacement, string> = {
  center:
    'bg-surface flex max-h-full w-[min(440px,100%)] flex-col gap-(--space-3) overflow-y-auto rounded-lg p-(--space-4) shadow-lg',
  top: 'flex max-h-full w-[min(720px,100%)] flex-col gap-5 overflow-y-auto',
  end: 'bg-surface flex h-full w-[min(440px,100vw)] flex-col overflow-y-auto shadow-lg',
  full: 'flex h-full w-full flex-col overflow-y-auto',
}

/** Elementos a los que se llega con Tab. */
const TABBABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  '[tabindex]:not([tabindex="-1"])',
]
  .map((selector) => `${selector}:not([hidden])`)
  .join(',')

/** Diálogos abiertos, del más viejo al más nuevo: solo el último atiende Escape y atrapa el foco. */
const openDialogs: symbol[] = []

/** Cuántos diálogos bloquean el scroll ahora, y el `overflow` que tenía la página antes. */
let scrollLocks = 0
let overflowBeforeLock = ''

/** Bloquea el scroll de la página; con varios diálogos abiertos se desbloquea al cerrar el último. */
function lockScroll(): void {
  if (scrollLocks === 0) {
    overflowBeforeLock = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  scrollLocks += 1
}

/** Libera un bloqueo de scroll y restaura el `overflow` anterior si era el último. */
function unlockScroll(): void {
  scrollLocks -= 1
  if (scrollLocks === 0) document.body.style.overflow = overflowBeforeLock
}

/** Lista los elementos enfocables con Tab dentro del panel, en orden de documento. */
function tabbablesIn(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR))
}

/** Mantiene el foco dentro del panel al apretar Tab o Mayús+Tab. */
function trapTab(event: KeyboardEvent, panel: HTMLElement): void {
  const tabbables = tabbablesIn(panel)
  const first = tabbables.at(0)
  const last = tabbables.at(-1)
  if (first === undefined || last === undefined) {
    event.preventDefault()
    panel.focus()
    return
  }
  const active = document.activeElement
  if (!panel.contains(active)) {
    event.preventDefault()
    first.focus()
  } else if (event.shiftKey && (active === first || active === panel)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

/** No hay nada a qué suscribirse: el valor de `useIsClient` no cambia después del montaje. */
function subscribeToNothing(): () => void {
  return () => undefined
}

/** `true` en el navegador y `false` en el servidor, sin desajustes de hidratación. */
function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  )
}

/**
 * Diálogo modal accesible (`.dialog` del diseño): panel sobre un fondo oscuro, con
 * `role="dialog"` y `aria-modal`, trampa de foco (Tab y Mayús+Tab no salen del panel), cierre con
 * Escape o con un clic en el fondo, scroll de la página bloqueado y foco devuelto a quien lo abrió.
 * Se dibuja en `document.body`, fuera del flujo de la página. Con varios abiertos, solo el último
 * reacciona al teclado.
 *
 * Por defecto es una tarjeta centrada. `placement` lo convierte en la capa del buscador (`top`),
 * en el panel lateral del carrito (`end`) o en una pantalla completa (`full`); `unstyled` y
 * `backdropClassName` dejan al consumidor el aspecto del panel y del fondo. Ninguna de estas
 * opciones toca el foco, Escape ni el bloqueo del scroll.
 *
 * @param props - Ver {@link DialogProps}.
 * @example
 * <Dialog open={isOpen} onClose={close} title="Verificá tu compra con tu banco">
 *   <iframe title="Banco" src={challengeUrl} />
 * </Dialog>
 * @example
 * <Dialog open={isOpen} onClose={close} title="Buscar" hideTitle placement="top" unstyled>
 *   <input type="search" aria-label="Buscar" />
 * </Dialog>
 */
export function Dialog({
  open,
  onClose,
  title,
  hideTitle = false,
  description,
  children,
  dismissible = true,
  initialFocusRef,
  placement = 'center',
  unstyled = false,
  className,
  backdropClassName,
}: DialogProps): ReactNode {
  const isClient = useIsClient()
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  // Las últimas versiones de estas props, para que cambiarlas no vuelva a abrir el diálogo.
  const onCloseRef = useRef(onClose)
  const dismissibleRef = useRef(dismissible)
  useEffect(() => {
    onCloseRef.current = onClose
    dismissibleRef.current = dismissible
  })

  const isShown = open && isClient

  useEffect(() => {
    const panel = panelRef.current
    if (!isShown || panel === null) return

    const token = Symbol('dialog')
    const isTop = (): boolean => openDialogs.at(-1) === token
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    openDialogs.push(token)
    lockScroll()
    ;(initialFocusRef?.current ?? tabbablesIn(panel).at(0) ?? panel).focus()

    function onKeyDown(event: KeyboardEvent): void {
      if (!isTop() || panel === null) return
      if (event.key === 'Escape') {
        if (dismissibleRef.current) onCloseRef.current()
      } else if (event.key === 'Tab') {
        trapTab(event, panel)
      }
    }
    function onFocusIn(event: FocusEvent): void {
      if (!isTop() || panel === null) return
      if (event.target instanceof Node && !panel.contains(event.target)) {
        ;(tabbablesIn(panel).at(0) ?? panel).focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('focusin', onFocusIn)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('focusin', onFocusIn)
      openDialogs.splice(openDialogs.indexOf(token), 1)
      unlockScroll()
      if (previouslyFocused?.isConnected === true) previouslyFocused.focus()
    }
  }, [isShown, initialFocusRef])

  if (!isShown) return null

  return createPortal(
    <div
      data-placement={placement}
      className={cx('fixed inset-0 z-50', CONTAINER_CLASSES[placement])}
    >
      <div
        aria-hidden="true"
        className={cx('absolute inset-0', backdropClassName ?? BACKDROP_CLASSES[placement])}
        onClick={() => {
          if (dismissible) onClose()
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description === undefined ? undefined : descriptionId}
        tabIndex={-1}
        className={cx(PANEL_BASE_CLASSES, unstyled ? null : PANEL_CLASSES[placement], className)}
      >
        <h2 id={titleId} className={hideTitle ? 'sr-only' : 'text-h4'}>
          {title}
        </h2>
        {description === undefined ? null : (
          <p id={descriptionId} className="text-[14px] opacity-85">
            {description}
          </p>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}
