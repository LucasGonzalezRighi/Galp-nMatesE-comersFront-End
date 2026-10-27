import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { MercadoPagoSimulator, OrderResultLoading } from '@/features/checkout'
import { getStoreEnv } from '@/lib/env'

/** Título de la pestaña (lleva la plantilla "· Galpón Mates"); no se indexa. */
export const metadata: Metadata = {
  title: 'Mercado Pago simulado',
  robots: { index: false, follow: false },
}

/**
 * Ruta `/checkout/mp-simulado` (spec 13.2): la página de Mercado Pago del modo de prueba, adonde
 * apunta la `initPoint` de la preferencia y el desafío 3-D Secure simulado. En vivo no existe
 * (404). La dirección se lee en el cliente, dentro de `Suspense`.
 */
export default function MercadoPagoSimulatorRoute(): ReactNode {
  if (getStoreEnv().apiMode !== 'mock') notFound()
  return (
    <Suspense fallback={<OrderResultLoading />}>
      <MercadoPagoSimulator />
    </Suspense>
  )
}
