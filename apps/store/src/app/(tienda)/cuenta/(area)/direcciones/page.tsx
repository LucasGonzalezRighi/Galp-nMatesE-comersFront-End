import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import { AccountSkeleton, AddressBook, requireAccountData } from '@/features/account'
import { getServerApiForRequest } from '@/lib/api.server'
import { listMyAddresses } from '@galpon/api-client'

/** Título de la pestaña (lleva la plantilla "· Galpón Mates"). */
export const metadata: Metadata = { title: 'Tus direcciones' }

/** Lee con la sesión del pedido la libreta de direcciones del cliente. */
async function Addresses(): Promise<ReactNode> {
  const api = getServerApiForRequest(await cookies())
  const addresses = await requireAccountData(() => listMyAddresses(api), '/cuenta/direcciones')
  return <AddressBook initialAddresses={addresses} />
}

/** Ruta `/cuenta/direcciones` (dinámica): la libreta del cliente, con esqueleto mientras carga. */
export default function AddressesRoute(): ReactNode {
  return (
    <Suspense fallback={<AccountSkeleton />}>
      <Addresses />
    </Suspense>
  )
}
