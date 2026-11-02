import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import { AccountOverview, AccountSkeleton, requireAccountData } from '@/features/account'
import { getServerApiForRequest } from '@/lib/api.server'
import { getMe, listMyAddresses, listMyOrders } from '@galpon/api-client'

/** Título de la pestaña (lleva la plantilla "· Galpón Mates"). */
export const metadata: Metadata = { title: 'Tu cuenta' }

/** Lee con la sesión del pedido los datos, el último pedido y la libreta del cliente. */
async function Overview(): Promise<ReactNode> {
  const api = getServerApiForRequest(await cookies())
  const [customer, orders, addresses] = await requireAccountData(
    () => Promise.all([getMe(api), listMyOrders(api, 1), listMyAddresses(api)]),
    '/cuenta',
  )
  return <AccountOverview customer={customer} orders={orders} addresses={addresses} />
}

/** Ruta `/cuenta` (dinámica): resumen y datos del cliente, con esqueleto mientras carga. */
export default function AccountRoute(): ReactNode {
  return (
    <Suspense fallback={<AccountSkeleton />}>
      <Overview />
    </Suspense>
  )
}
