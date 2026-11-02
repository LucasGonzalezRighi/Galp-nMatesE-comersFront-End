import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { Checkout, CheckoutSkeleton } from '@/features/checkout'
import { getPublicSettings } from '@/lib/data/settings'
import { getStoreEnv } from '@/lib/env'
import { buildPageMetadata } from '@/lib/seo'

/** Título y descripción de la página (el título lleva la plantilla "· Galpón Mates"); sin indexar. */
export const metadata: Metadata = buildPageMetadata({
  title: 'Finalizá tu compra',
  description: 'Contacto, envío y pago con Mercado Pago, en tres pasos.',
  path: '/checkout',
  siteUrl: getStoreEnv().siteUrl,
  noIndex: true,
})

/**
 * Página `/checkout` (spec 14): las opciones de envío salen de los ajustes públicos (cacheados) y
 * el modo de la API y la clave pública de Mercado Pago, de la configuración del servidor. Todo lo
 * demás es del cliente (`Checkout`), dentro de un `<Suspense>` porque lee `?pedido=`.
 */
export default async function CheckoutPage(): Promise<ReactNode> {
  const settings = await getPublicSettings()
  const { apiMode, mpPublicKey } = getStoreEnv()
  return (
    <main className="pb-10">
      <Suspense fallback={<CheckoutSkeleton />}>
        <Checkout
          apiMode={apiMode}
          mpPublicKey={mpPublicKey}
          shippingOptions={settings.shippingOptions}
        />
      </Suspense>
    </main>
  )
}
