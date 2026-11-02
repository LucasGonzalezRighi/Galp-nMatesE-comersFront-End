'use client'

import { useEffect } from 'react'
import { openSearch } from '@/components/layout/search-trigger'

/** Elementos donde "/" es una tecla más: campos de texto, listas y contenido editable. */
const EDITABLE_SELECTOR =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

/** Indica si el foco está en algo donde se escribe (o dentro de ello). */
function isTyping(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(EDITABLE_SELECTOR) !== null
}

/**
 * Atajo de teclado del buscador (spec 9.5): la tecla "/" lo abre, salvo mientras se escribe en un
 * campo (ahí es un carácter más) y sin Ctrl, Cmd ni Alt. Evita que la barra se escriba en el campo
 * que recibe el foco al abrir.
 */
export function useSearchShortcut(): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key !== '/' || event.defaultPrevented || event.isComposing) return
      if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return
      event.preventDefault()
      openSearch()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])
}
