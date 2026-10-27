import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { CheckoutResult, OrderResultLoading } from '@/features/checkout'
import { getStoreEnv } from '@/lib/env'

/** Título de la pestaña (lleva la plantilla "· Galpón Mates"); no se indexa: es personal. */
export const metadata: Metadata = {
  title: 'Resultado del pago',
  robots: { index: false, follow: false },
}

/**
 * Ruta `/checkout/resultado?pedido=GLP-…` (dinámica, spec 14.2): estado del pago del pedido de la
 * pestaña. La dirección se lee en el cliente, dentro de `Suspense`.
 */
export default function CheckoutResultRoute(): ReactNode {
  return (
    <Suspense fallback={<OrderResultLoading />}>
      <CheckoutResult apiMode={getStoreEnv().apiMode} />
    </Suspense>
  )
}
