import type { ProductDetail, ProductTabsContent } from '@galpon/api-client'
import type { ProductTab } from './ProductTabs'
import { PRODUCT_COPY } from './product.copy'

/**
 * Arma las cuatro pestañas de la ficha con los textos que devuelve la API (`ProductDetail.tabs`,
 * que ya trae el texto del producto o, si no tiene, el de su grupo): Descripción (la descripción
 * más la nota, si hay), Materiales o Contenido, Envío y cambios, y Cuidado o Conservación. Los
 * títulos que cambian según el grupo salen de los textos editables de las pestañas.
 *
 * @param product - La ficha del producto.
 * @param content - Textos de las pestañas por grupo (`GET /content/product-tabs`).
 * @returns Las cuatro pestañas, en el orden en que se muestran.
 */
export function buildProductTabs(
  product: ProductDetail,
  content: ProductTabsContent,
): ProductTab[] {
  const group = content[product.group]
  const description = [product.description, product.tabs.descriptionNote]
    .filter((text): text is string => text !== null && text.trim() !== '')
    .join(' ')
  return [
    { id: 'description', label: PRODUCT_COPY.tabDescription, text: description },
    { id: 'materials', label: group.materialsTitle, text: product.tabs.materials },
    { id: 'shipping', label: PRODUCT_COPY.tabShipping, text: product.tabs.shipping },
    { id: 'care', label: group.careTitle, text: product.tabs.care },
  ]
}
