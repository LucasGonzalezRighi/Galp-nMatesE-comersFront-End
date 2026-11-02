import type { MetadataRoute } from 'next'
import { listProductSlugs } from '@/features/product'
import { getCategories } from '@/lib/data/catalog'
import { getStoreEnv } from '@/lib/env'
import { buildSitemapEntries } from '@/lib/seo'

/**
 * `/sitemap.xml`: inicio, tienda, las líneas, los productos publicados y las páginas informativas.
 * Lee los mismos datos cacheados que las páginas, así que se regenera con las etiquetas
 * `categories` y `products`.
 *
 * @throws {ApiError} Si la API falla.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, productSlugs] = await Promise.all([getCategories(), listProductSlugs()])
  return buildSitemapEntries({
    siteUrl: getStoreEnv().siteUrl,
    lineSlugs: categories.map((category) => category.slug),
    productSlugs,
  })
}
