import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { KitBuilder, KitHero } from '@/features/kit'
import { getPublicSettings } from '@/lib/data/settings'
import { getStoreEnv } from '@/lib/env'
import { buildPageMetadata } from '@/lib/seo'
import { getKitProducts } from './kit-data'

/** Título y descripción de la página; el título lleva la plantilla "· Galpón Mates" del layout. */
export const metadata: Metadata = buildPageMetadata({
  title: 'Armá tu kit',
  description:
    'Elegí mate, bombilla y yerba en tres pasos y llevate la ronda completa con descuento sobre el total.',
  path: '/kit',
  siteUrl: getStoreEnv().siteUrl,
})

/**
 * Página "Armá tu kit" (`/kit` y `/kit?mate={slug}`): estática, con el catálogo comprable y el
 * descuento del kit leídos del servidor (cacheados). Toda la interacción es del cliente
 * (`KitBuilder`), y `?mate=` lo aplica `KitMateLink` dentro de su propio `<Suspense>`.
 */
export default async function KitPage(): Promise<ReactNode> {
  const [products, settings] = await Promise.all([getKitProducts(), getPublicSettings()])
  return (
    <main className="pb-10">
      <KitHero discountPercent={settings.kitDiscountPercent} />
      <KitBuilder products={products} discountPercent={settings.kitDiscountPercent} />
    </main>
  )
}
