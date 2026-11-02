import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { GuestOrderTracking, OrderResultLoading } from '@/features/checkout'
import { getStoreEnv } from '@/lib/env'

/** Título de la pestaña (lleva la plantilla "· Galpón Mates"); no se indexa: es personal. */
export const metadata: Metadata = {
  title: 'Tu pedido',
  robots: { index: false, follow: false },
}

/**
 * Ruta `/pedido/[numero]`: seguimiento del pedido de invitado con el token guardado en la pestaña
 * (`sessionStorage`). El número se lee en el cliente, dentro de `Suspense`, como en
 * `/checkout/resultado`: un hueco dinámico del servidor por `params` dejaba la pantalla en
 * "Consultando tu pedido…" sin hidratar. Sin token o con otro número muestra "No encontramos ese
 * pedido" sin revelar si existe.
 */
export default function GuestOrderRoute(): ReactNode {
  return (
    <Suspense fallback={<OrderResultLoading />}>
      <GuestOrderTracking apiMode={getStoreEnv().apiMode} />
    </Suspense>
  )
}
