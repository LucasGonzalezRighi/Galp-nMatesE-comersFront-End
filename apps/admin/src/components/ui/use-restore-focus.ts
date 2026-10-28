import { useRef } from 'react'

/** Manejadores que Radix espera en el contenido de un diálogo (`onOpenAutoFocus` y `onCloseAutoFocus`). */
export interface RestoreFocusHandlers {
  /** Anota qué elemento tenía el foco cuando el diálogo se abrió. */
  onOpenAutoFocus: () => void
  /** Devuelve el foco al elemento anotado, si sigue en pantalla y nadie más lo tomó. */
  onCloseAutoFocus: (event: Event) => void
}

/**
 * Devuelve el foco, al cerrarse un diálogo controlado, a quien lo tenía al abrirse. Sin `Trigger`
 * (el diálogo se abre con estado, no con un disparador de Radix), Radix no sabe adónde volver y
 * el foco quedaría en el `body`: quien navega con teclado perdería su lugar.
 *
 * Un cuadro después de cerrarse, si otro código ya enfocó algo (el `h1` de la pantalla nueva al
 * navegar), se respeta; solo se vuelve al anotado si el foco quedó en el `body`. Si el elemento
 * anotado ya no existe, se deja el comportamiento de Radix.
 *
 * @returns Los manejadores para el contenido del diálogo (ver {@link RestoreFocusHandlers}).
 * @example
 * const { onOpenAutoFocus, onCloseAutoFocus } = useRestoreFocus()
 * return <RadixDialog.Content onOpenAutoFocus={onOpenAutoFocus} onCloseAutoFocus={onCloseAutoFocus} />
 */
export function useRestoreFocus(): RestoreFocusHandlers {
  const openerRef = useRef<HTMLElement | null>(null)
  return {
    onOpenAutoFocus: () => {
      const active = document.activeElement
      openerRef.current = active instanceof HTMLElement ? active : null
    },
    onCloseAutoFocus: (event) => {
      const opener = openerRef.current
      openerRef.current = null
      if (!opener?.isConnected) return
      event.preventDefault()
      requestAnimationFrame(() => {
        const active = document.activeElement
        if (active === null || active === document.body) opener.focus()
      })
    },
  }
}
