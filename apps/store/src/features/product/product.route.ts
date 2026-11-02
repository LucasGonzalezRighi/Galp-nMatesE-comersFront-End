import type { Metadata } from 'next'
import { getStoreEnv } from '../../lib/env'
import { buildMissingProductMetadata, buildProductMetadata } from './product-seo'
import { findProduct, listProductSlugs } from './product.data'

/**
 * Slug de relleno de `generateStaticParams` cuando todavía no hay productos publicados: con Cache
 * Components la lista no puede quedar vacía, y la página de este slug responde `notFound()`.
 */
export const PRODUCT_PLACEHOLDER_SLUG = 'sin-productos'

/**
 * Parámetros de `generateStaticParams` de `/producto/[slug]`: un producto por página estática (o
 * uno de relleno si no hay ninguno, que la página responde con `notFound()`). Un producto que se
 * publique después se genera la primera vez que se pide y se guarda.
 *
 * @throws {ApiError} Si la API falla.
 */
export async function getProductParams(): Promise<{ slug: string }[]> {
  const slugs = await listProductSlugs()
  return (slugs.length > 0 ? slugs : [PRODUCT_PLACEHOLDER_SLUG]).map((slug) => ({ slug }))
}

/**
 * Metadatos de la ficha: título, descripción, dirección canónica y datos para compartir. Un
 * producto que no existe (o un slug inválido) lleva `noindex`.
 *
 * @param slug - Lo que vino en la dirección, sin confiar en su forma.
 * @throws {ApiError} Si la API falla por otra causa que "no existe".
 */
export async function getProductMetadata(slug: string): Promise<Metadata> {
  const product = await findProduct(slug)
  if (product === null) return buildMissingProductMetadata()
  return buildProductMetadata(product, getStoreEnv().siteUrl)
}
