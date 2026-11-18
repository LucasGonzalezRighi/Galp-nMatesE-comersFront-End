'use client'

import type { ReactNode } from 'react'
import { useLayoutEffect, useSyncExternalStore } from 'react'
import { usePageTransition } from './intro-context'
import { prefersReducedMotion } from './reduced-motion'
import './intro.css'

/** No hay nada que escuchar: solo distingue el HTML del servidor (y la hidratación) del cliente. */
function subscribe(): () => void {
  return () => undefined
}

/**
 * La intro del inicio (Rulings MR-29 y AI-3): se monta en el inicio y le avisa al proveedor de la
 * transición cada vez que el inicio se muestra (al cargarlo, al volver desde otra página o cuando
 * Next lo devuelve de su caché de rutas). El proveedor decide: la intro dibujada solo si es la
 * primera página que cargó el navegador; desde adentro del sitio, el telón con el logo. El
 * servidor pinta una tapa lisa fija (`data-intro-cover`) para que no se vea la página antes de la
 * intro; se va apenas hidrata, cuando la capa del proveedor ya la reemplazó. Con menos movimiento
 * no hay intro ni telón (la tapa tampoco se ve) y sin proveedor no hace nada.
 */
export function HomeIntro(): ReactNode {
  const transition = usePageTransition()
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )

  // Antes de pintar: la capa del proveedor tapa el inicio desde el primer cuadro.
  useLayoutEffect(() => {
    if (transition === null || prefersReducedMotion()) return
    transition.startIntro()
    return () => {
      transition.stopIntro()
    }
  }, [transition])

  return hydrated ? null : <div data-intro-cover="" aria-hidden="true" className="intro-cover" />
}
