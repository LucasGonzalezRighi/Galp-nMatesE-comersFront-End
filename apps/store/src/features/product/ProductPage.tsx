import type { ReactNode } from 'react'
import { notFound, permanentRedirect } from 'next/navigation'
import { getPublicSettings } from '../../lib/data/settings'
import { getStoreEnv } from '../../lib/env'
import { ReviewsSection } from '../reviews'
import { findProduct, getProductReviews, getRelatedProducts, getTabsContent } from './product.data'
import { ProductDetailView } from './ProductDetailView'
import { ProductJsonLd } from './ProductJsonLd'
import { RelatedProducts } from './RelatedProducts'

/** Props de {@link ProductPage}. */
export interface ProductPageProps {
  /** Lo que vino en la dirección (`/producto/{slug}`), sin confiar en su forma. */
  slug: string
}

/**
 * Ficha de un producto (spec 9.5): la ficha completa, las reseñas y los relacionados.
 *
 * Un slug inválido (mayúsculas, `..`, `%`) o inexistente responde `notFound()`. Con un slug
 * anterior, la API devuelve el producto con su slug actual y la página redirige con
 * `permanentRedirect` (308).
 *
 * @param props - Ver {@link ProductPageProps}.
 * @throws {ApiError} Si la API falla por otra causa que "no existe".
 */
export async function ProductPage({ slug }: ProductPageProps): Promise<ReactNode> {
  const product = await findProduct(slug)
  if (product === null) notFound()
  if (product.slug !== slug) permanentRedirect(`/producto/${encodeURIComponent(product.slug)}`)

  const [settings, tabsContent, related, reviews] = await Promise.all([
    getPublicSettings(),
    getTabsContent(),
    getRelatedProducts(product.slug),
    getProductReviews(product.slug),
  ])

  return (
    <main className="pb-10">
      <ProductJsonLd product={product} siteUrl={getStoreEnv().siteUrl} />
      <ProductDetailView product={product} settings={settings} tabsContent={tabsContent} />
      <ReviewsSection slug={product.slug} productName={product.name} page={reviews} />
      <RelatedProducts products={related} settings={settings} />
    </main>
  )
}
