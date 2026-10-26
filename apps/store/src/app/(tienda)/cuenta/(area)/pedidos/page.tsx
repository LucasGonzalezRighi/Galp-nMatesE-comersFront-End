import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import { AccountSkeleton, OrdersList, requireAccountData } from '@/features/account'
import { getServerApiForRequest } from '@/lib/api.server'
import { listMyOrders } from '@galpon/api-client'

/** Título de la pestaña (lleva la plantilla "· Galpón Mates"). */
export const metadata: Metadata = { title: 'Tus pedidos' }

/** Lee con la sesión del pedido la primera página de pedidos del cliente. */
async function Orders(): Promise<ReactNode> {
  const api = getServerApiForRequest(await cookies())
  const page = await requireAccountData(() => listMyOrders(api, 1), '/cuenta/pedidos')
  return <OrdersList initialPage={page} />
}

/** Ruta `/cuenta/pedidos` (dinámica): los pedidos del cliente, con esqueleto mientras carga. */
export default function OrdersRoute(): ReactNode {
  return (
    <Suspense fallback={<AccountSkeleton />}>
      <Orders />
    </Suspense>
  )
}
