import type { Metadata } from 'next'
import type { ProductDetail } from '@galpon/api-client'

/** Marca que figura en los datos estructurados. */
const BRAND_NAME = 'Galpón Mates'

/** Largo máximo de la descripción en los metadatos (lo que suelen mostrar los buscadores). */
const DESCRIPTION_MAX_LENGTH = 160

/** Ruta pública de la ficha de un producto. */
function productPath(slug: string): string {
  return `/producto/${encodeURIComponent(slug)}`
}

/** Convierte una dirección relativa (`/mock-images/…`) en absoluta; deja como está la que ya lo es. */
function absoluteUrl(url: string, siteUrl: string): string {
  return /^https?:\/\//.test(url) ? url : `${siteUrl}${url.startsWith('/') ? '' : '/'}${url}`
}

/** Acorta un texto a `max` caracteres, cortando en una palabra y cerrando con "…". */
function shorten(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

/**
 * Metadatos de la ficha: título (la plantilla del layout agrega "· Galpón Mates"), descripción,
 * dirección canónica y datos para compartir (Open Graph y Twitter) con la foto principal.
 *
 * @param product - La ficha del producto.
 * @param siteUrl - Origen público de la tienda, sin barra final (`NEXT_PUBLIC_SITE_URL`).
 * @throws {RangeError} Si `siteUrl` está vacío.
 * @example
 * export const generateMetadata = async () => buildProductMetadata(product, env.siteUrl)
 */
export function buildProductMetadata(product: ProductDetail, siteUrl: string): Metadata {
  if (siteUrl === '') throw new RangeError('siteUrl no puede estar vacío.')
  const url = `${siteUrl}${productPath(product.slug)}`
  const description = shorten(product.description, DESCRIPTION_MAX_LENGTH)
  const image = product.images[0]
  const images =
    image === undefined ? [] : [{ url: absoluteUrl(image.url, siteUrl), alt: image.alt }]
  return {
    title: product.name,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', url, title: product.name, description, images },
    twitter: { card: images.length > 0 ? 'summary_large_image' : 'summary', images },
  }
}

/**
 * Metadatos de una ficha que no existe: sin indexar.
 *
 * @returns Título y la orden de no indexar.
 */
export function buildMissingProductMetadata(): Metadata {
  return { title: 'Producto no encontrado', robots: { index: false, follow: false } }
}

/**
 * Datos estructurados `schema.org/Product` de la ficha (JSON-LD): nombre, descripción, código,
 * fotos, línea, oferta en pesos con su disponibilidad (solo si tiene precio) y la valoración (solo
 * si hay reseñas).
 *
 * @param product - La ficha del producto.
 * @param siteUrl - Origen público de la tienda, sin barra final.
 * @throws {RangeError} Si `siteUrl` está vacío.
 * @returns Un objeto serializable a JSON.
 */
export function buildProductJsonLd(
  product: ProductDetail,
  siteUrl: string,
): Record<string, unknown> {
  if (siteUrl === '') throw new RangeError('siteUrl no puede estar vacío.')
  const url = `${siteUrl}${productPath(product.slug)}`
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    sku: product.code,
    category: product.categoryName,
    url,
    brand: { '@type': 'Brand', name: BRAND_NAME },
    ...(product.images.length > 0
      ? { image: product.images.map((image) => absoluteUrl(image.url, siteUrl)) }
      : null),
    ...(product.priceArs === null
      ? null
      : {
          offers: {
            '@type': 'Offer',
            url,
            price: product.priceArs,
            priceCurrency: 'ARS',
            itemCondition: 'https://schema.org/NewCondition',
            availability: product.isSoldOut
              ? 'https://schema.org/OutOfStock'
              : 'https://schema.org/InStock',
          },
        }),
    ...(product.rating.count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Math.round(product.rating.average * 10) / 10,
            reviewCount: product.rating.count,
          },
        }
      : null),
  }
}

/**
 * Serializa datos estructurados para ponerlos dentro de un `<script type="application/ld+json">`.
 * Escapa `<` (como `<`) para que un texto del producto no pueda cerrar la etiqueta.
 *
 * @param data - Objeto serializable a JSON.
 * @returns El JSON, listo para el cuerpo del script.
 */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
