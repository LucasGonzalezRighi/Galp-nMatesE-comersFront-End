import type { RefObject } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

/**
 * Lleva el foco al `h1` de la pantalla cada vez que cambia la ruta (no en la primera carga), así
 * un lector de pantalla anuncia la pantalla nueva. Los cambios de búsqueda (filtros, página) no
 * mueven el foco.
 *
 * @returns El ref que va en el `main` donde se busca el `h1`.
 */
export function useFocusHeadingOnNavigate(): RefObject<HTMLElement | null> {
  const mainRef = useRef<HTMLElement>(null)
  const pathname = useRouterState({ select: (state) => state.resolvedLocation?.pathname })
  const previous = useRef(pathname)

  useEffect(() => {
    if (previous.current === pathname) return
    const isFirstLoad = previous.current === undefined
    previous.current = pathname
    if (isFirstLoad) return
    mainRef.current?.querySelector<HTMLElement>('h1')?.focus()
  }, [pathname])

  return mainRef
}
