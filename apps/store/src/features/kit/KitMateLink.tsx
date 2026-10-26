'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import type { KitProduct } from './kit-products'
import { linkedMate } from './kit-view'
import { useKitStore } from './kit.store'

/** Props de {@link KitMateLink}. */
export interface KitMateLinkProps {
  /** Productos comprables que ofrece el kit. */
  products: readonly KitProduct[]
}

/**
 * Aplica `/kit?mate={slug}` (spec 9.1): si el slug es de un mate comprable, lo elige, conserva
 * lo que ya estaba elegido y abre el paso Bombilla; si no sirve, no hace nada. No muestra nada.
 *
 * Lee los parámetros con `useSearchParams`, así que va dentro de un `<Suspense>` y el resto de la
 * página puede seguir siendo estático.
 *
 * @param props - Ver {@link KitMateLinkProps}.
 */
export function KitMateLink({ products }: KitMateLinkProps): ReactNode {
  const mateId = linkedMate(useSearchParams().get('mate'), products)?.id
  useEffect(() => {
    if (mateId !== undefined) useKitStore.getState().chooseMateFromLink(mateId)
  }, [mateId])
  return null
}
