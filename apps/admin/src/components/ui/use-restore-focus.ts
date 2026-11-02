import { useRef } from 'react'

/** Manejadores que Radix espera en el contenido de un diálogo (`onOpenAutoFocus` y `onCloseAutoFocus`). */
export interface RestoreFocusHandlers {
  /** Anota qué elemento tenía el foco cuando el diálogo se abrió. */
  onOpenAutoFocus: () => void
  /** Devuelve el foco al elemento anotado (o al de `returnFocusTo`), si nadie más lo tomó. */
  onCloseAutoFocus: (event: Event) => void
}

/**
 * Elige adónde va el foco al cerrarse un diálogo, en lugar del elemento que lo tenía al abrirse.
 * Devuelve `null` para volver a ese elemento (por ejemplo, si se canceló).
 */
export type ReturnFocusTarget = () => HTMLElement | null

/**
 * Devuelve el foco, al cerrarse un diálogo controlado, a quien lo tenía al abrirse. Sin `Trigger`
 * (el diálogo se abre con estado, no con un disparador de Radix), Radix no sabe adónde volver y
 * el foco quedaría en el `body`: quien navega con teclado perdería su lugar.
 *
 * Con `returnFocusTo`, al cerrarse se le pregunta adónde ir: si devuelve un elemento, el foco va
 * ahí y no al abridor. Sirve cuando lo confirmado saca de la pantalla el botón que abrió el
 * diálogo (archivar o borrar una fila, cambiar el estado de un pedido): el abridor puede seguir
 * en pantalla al cerrarse y desaparecer con la recarga, así que un respaldo para un abridor que ya
 * no está no alcanza.
 *
 * Un cuadro después de cerrarse, si otro código ya enfocó algo (el `h1` de la pantalla nueva al
 * navegar), se respeta; solo se mueve el foco si quedó en el `body`. Si el destino ya no existe,
 * se deja el comportamiento de Radix.
 *
 * @param returnFocusTo - Adónde ir en lugar del abridor (ver {@link ReturnFocusTarget}).
 * @returns Los manejadores para el contenido del diálogo (ver {@link RestoreFocusHandlers}).
 * @example
 * const { onOpenAutoFocus, onCloseAutoFocus } = useRestoreFocus()
 * return <RadixDialog.Content onOpenAutoFocus={onOpenAutoFocus} onCloseAutoFocus={onCloseAutoFocus} />
 */
export function useRestoreFocus(returnFocusTo?: ReturnFocusTarget): RestoreFocusHandlers {
  const openerRef = useRef<HTMLElement | null>(null)
  return {
    onOpenAutoFocus: () => {
      const active = document.activeElement
      openerRef.current = active instanceof HTMLElement ? active : null
    },
    onCloseAutoFocus: (event) => {
      const opener = openerRef.current
      openerRef.current = null
      const target = returnFocusTo?.() ?? opener
      if (!target?.isConnected) return
      event.preventDefault()
      requestAnimationFrame(() => {
        const active = document.activeElement
        if (active === null || active === document.body) target.focus()
      })
    },
  }
}
