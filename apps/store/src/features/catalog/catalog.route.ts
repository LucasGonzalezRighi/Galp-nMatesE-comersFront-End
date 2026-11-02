import type { Metadata } from 'next'
import { getCategories } from '../../lib/data/catalog'
import { getStoreEnv } from '../../lib/env'
import { buildPageMetadata } from '../../lib/seo'
import { catalogLineParams } from './catalog-scope'
import { CATALOG_COPY } from './catalog.copy'

/**
 * Parámetros de `generateStaticParams` de `/tienda/[linea]`: una línea por cada una del listado
 * (o una de relleno si no hay, que la página responde con `notFound()`).
 *
 * @throws {ApiError} Si la API falla.
 */
export async function getCatalogLineParams(): Promise<{ linea: string }[]> {
  return catalogLineParams(await getCategories())
}

/**
 * Metadatos de la página del catálogo: "Tienda" o el nombre de la línea, con su bajada.
 *
 * @param lineSlug - Slug de la línea, o `null` para todo el catálogo.
 * @returns Los metadatos; vacíos si la línea no existe (la página responde `notFound()`).
 * @throws {ApiError} Si la API falla.
 */
export async function getCatalogMetadata(lineSlug: string | null): Promise<Metadata> {
  const { siteUrl } = getStoreEnv()
  if (lineSlug === null) {
    return buildPageMetadata({
      title: CATALOG_COPY.eyebrow,
      description: CATALOG_COPY.allBlurb,
      path: '/tienda',
      siteUrl,
    })
  }
  const line = (await getCategories()).find((item) => item.slug === lineSlug)
  if (line === undefined) return {}
  return buildPageMetadata({
    title: `${line.name} · ${CATALOG_COPY.eyebrow}`,
    description: line.blurb === '' ? CATALOG_COPY.allBlurb : line.blurb,
    path: `/tienda/${encodeURIComponent(line.slug)}`,
    siteUrl,
  })
}
