'use client'

import type { ReactNode } from 'react'
import { useParams } from 'next/navigation'
import type { ApiMode } from '@/lib/env'
import { OrderResult } from './OrderResult'

/** Props de {@link GuestOrderTracking}. */
export interface GuestOrderTrackingProps {
  /** Modo de la API, leído en el servidor. */
  apiMode: ApiMode
}

/**
 * `/pedido/[numero]`: seguimiento del pedido de invitado con el token de la pestaña. Lee el número
 * de la dirección en el cliente (`useParams`), como hace `CheckoutResult` con `?pedido=`: así la
 * página no deja un hueco dinámico del servidor que haya que hidratar aparte, y el pedido se
 * consulta apenas carga. Usa `useParams`: la página lo pone dentro de `Suspense`.
 *
 * @param props - Ver {@link GuestOrderTrackingProps}.
 */
export function GuestOrderTracking({ apiMode }: GuestOrderTrackingProps): ReactNode {
  const { numero } = useParams<{ numero?: string }>()
  return <OrderResult number={numero ?? null} apiMode={apiMode} variant="tracking" />
}
