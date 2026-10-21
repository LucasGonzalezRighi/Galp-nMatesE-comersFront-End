'use client'

import type { ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useLayoutEffect, useRef } from 'react'

/** Props de los vigilantes de ruta. */
interface RouteWatcherProps {
  /** Se llama cuando la ruta cambia (no en el primer render). Conviene que sea estable. */
  onChange: () => void
}

/** Llama a `onChange` cada vez que `routeKey` cambia respecto del render anterior. */
function useOnKeyChange(routeKey: string, onChange: () => void): void {
  const previous = useRef(routeKey)
  // Antes de que el navegador pinte, para que el contenido nuevo no se vea ni un cuadro.
  useLayoutEffect(() => {
    if (previous.current === routeKey) return
    previous.current = routeKey
    onChange()
  }, [routeKey, onChange])
}

/** Vigilante que mira el `pathname` y los parámetros de búsqueda. */
function RouteWatcherInner({ onChange }: RouteWatcherProps): null {
  const pathname = usePathname()
  const search = useSearchParams().toString()
  useOnKeyChange(`${pathname}?${search}`, onChange)
  return null
}

/**
 * No dibuja nada: avisa cuando cambia el `pathname`. Usa solo `usePathname`, que no exige
 * `Suspense`.
 *
 * @param props - Ver `RouteWatcherProps`.
 */
export function PathnameWatcher({ onChange }: RouteWatcherProps): null {
  useOnKeyChange(usePathname(), onChange)
  return null
}

/**
 * No dibuja nada: avisa cuando cambia el `pathname` o los parámetros de búsqueda. Va dentro de su
 * propio `Suspense` porque `useSearchParams` lo exige en las rutas estáticas; así el contenido de la
 * página, que no está dentro, no se ve afectado.
 *
 * @param props - Ver `RouteWatcherProps`.
 */
export function RouteWatcher({ onChange }: RouteWatcherProps): ReactNode {
  return (
    <Suspense fallback={null}>
      <RouteWatcherInner onChange={onChange} />
    </Suspense>
  )
}
