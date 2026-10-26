import type { ReactNode } from 'react'
import type { ProductDetail } from '@galpon/api-client'
import { buildProductJsonLd, serializeJsonLd } from './product-seo'

/** Props de {@link ProductJsonLd}. */
export interface ProductJsonLdProps {
  /** La ficha del producto. */
  product: ProductDetail
  /** Origen público de la tienda, sin barra final. */
  siteUrl: string
}

/**
 * Datos estructurados del producto (`schema.org/Product`) en un script `application/ld+json`. El
 * JSON va como texto del script (sin HTML crudo) y con `<` escapado.
 *
 * @param props - Ver {@link ProductJsonLdProps}.
 * @throws {RangeError} Si `siteUrl` está vacío.
 */
export function ProductJsonLd({ product, siteUrl }: ProductJsonLdProps): ReactNode {
  return (
    <script type="application/ld+json">
      {serializeJsonLd(buildProductJsonLd(product, siteUrl))}
    </script>
  )
}
