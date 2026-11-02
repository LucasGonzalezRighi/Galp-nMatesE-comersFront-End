import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { getCategories } from '../../lib/data/catalog'
import { getPublicSettings } from '../../lib/data/settings'
import { buildCatalogScope } from './catalog-scope'
import { getCatalogProducts } from './catalog.data'
import { CatalogBrowser } from './CatalogBrowser'

/** Props de {@link CatalogPage}. */
export interface CatalogPageProps {
  /** Slug de la línea de la dirección (`/tienda/{slug}`), o `null` en `/tienda`. */
  lineSlug: string | null
}

/**
 * Página del catálogo de la tienda (Server Component): lee las líneas, el catálogo publicado y los
 * ajustes (lecturas cacheadas de `lib/data`) y se los pasa al catálogo interactivo, así la página
 * es estática. Si la línea no existe responde `notFound()`.
 *
 * @param props - Ver {@link CatalogPageProps}.
 * @throws {ApiError} Si la API falla.
 */
export async function CatalogPage({ lineSlug }: CatalogPageProps): Promise<ReactNode> {
  const [categories, products, settings] = await Promise.all([
    getCategories(),
    getCatalogProducts(),
    getPublicSettings(),
  ])
  const scope = buildCatalogScope(categories, products, lineSlug)
  if (scope === null) notFound()
  return (
    <main>
      <CatalogBrowser
        scope={scope}
        settings={{
          installments: settings.installments,
          showNetPrice: settings.priceDisplay.showNetPrice,
          kitDiscountPercent: settings.kitDiscountPercent,
        }}
      />
    </main>
  )
}
