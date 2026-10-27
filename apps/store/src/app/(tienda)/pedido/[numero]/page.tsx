import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { OrderResult, OrderResultLoading } from '@/features/checkout'
import { getStoreEnv } from '@/lib/env'

/** Título de la pestaña (lleva la plantilla "· Galpón Mates"); no se indexa: es personal. */
export const metadata: Metadata = {
  title: 'Tu pedido',
  robots: { index: false, follow: false },
}

/** Props de la ruta. */
interface GuestOrderRouteProps {
  /** Parámetros de la dirección: el número de pedido. */
  params: Promise<{ numero: string }>
}

/** Lee el número de la dirección y muestra el pedido con el token de la pestaña. */
async function GuestOrder({ params }: GuestOrderRouteProps): Promise<ReactNode> {
  const { numero } = await params
  return <OrderResult number={numero} apiMode={getStoreEnv().apiMode} variant="tracking" />
}

/**
 * Ruta `/pedido/[numero]` (dinámica): seguimiento del pedido de invitado con el token guardado en
 * la pestaña (`sessionStorage`). Sin token o con otro número muestra "No encontramos ese pedido"
 * sin revelar si existe.
 */
export default function GuestOrderRoute({ params }: GuestOrderRouteProps): ReactNode {
  return (
    <Suspense fallback={<OrderResultLoading />}>
      <GuestOrder params={params} />
    </Suspense>
  )
}
