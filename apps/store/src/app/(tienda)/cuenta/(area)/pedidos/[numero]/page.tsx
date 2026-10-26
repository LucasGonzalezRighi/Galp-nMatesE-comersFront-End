import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { AccountSkeleton, OrderDetail, requireAccountData } from '@/features/account'
import { getServerApiForRequest } from '@/lib/api.server'
import { getMyOrder } from '@galpon/api-client'
import { isOrderNumber } from '@galpon/domain'

/** Título de la pestaña (lleva la plantilla "· Galpón Mates"). */
export const metadata: Metadata = { title: 'Detalle del pedido' }

/** Props de la ruta. */
interface OrderRouteProps {
  /** Parámetros de la dirección: el número de pedido. */
  params: Promise<{ numero: string }>
}

/**
 * Lee el pedido con la sesión del pedido entrante. Un número con otro formato, un pedido que no
 * existe o uno de otro cliente terminan en la misma página de no encontrado (no revela cuál).
 */
async function Order({ params }: OrderRouteProps): Promise<ReactNode> {
  const { numero } = await params
  if (!isOrderNumber(numero)) notFound()
  const api = getServerApiForRequest(await cookies())
  const order = await requireAccountData(() => getMyOrder(api, numero), `/cuenta/pedidos/${numero}`)
  return <OrderDetail order={order} />
}

/** Ruta `/cuenta/pedidos/[numero]` (dinámica): estado, pago, envío y líneas de un pedido. */
export default function OrderRoute({ params }: OrderRouteProps): ReactNode {
  return (
    <Suspense fallback={<AccountSkeleton />}>
      <Order params={params} />
    </Suspense>
  )
}
