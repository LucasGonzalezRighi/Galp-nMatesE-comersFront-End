import type { ApiClient, ProductSummary } from '@galpon/api-client'
import { listProducts } from '@galpon/api-client'

/** Ids por pedido: la consulta `ids` del contrato admite hasta 4000 caracteres y 100 por página. */
const IDS_PER_REQUEST = 50

/**
 * Clave de la consulta que trae los datos de los productos del carrito.
 *
 * @param ids - Ids de los productos, ordenados y sin repetir (`cartProductIds`).
 */
export function cartProductsKey(ids: readonly string[]): readonly ['cart', 'products', string] {
  return ['cart', 'products', ids.join(',')]
}

/**
 * Trae del catálogo los productos del carrito (`GET /products?ids=`, de a {@link IDS_PER_REQUEST}).
 * Los productos despublicados, archivados o inexistentes no vienen en la respuesta.
 *
 * @param api - Cliente de la API del navegador.
 * @param ids - Ids de los productos.
 * @throws {ApiError} Si falla alguna de las llamadas.
 */
export async function fetchCartProducts(
  api: ApiClient,
  ids: readonly string[],
): Promise<ProductSummary[]> {
  const products: ProductSummary[] = []
  for (let start = 0; start < ids.length; start += IDS_PER_REQUEST) {
    const chunk = ids.slice(start, start + IDS_PER_REQUEST)
    const page = await listProducts(api, { ids: chunk.join(','), pageSize: chunk.length })
    products.push(...page.items)
  }
  return products
}
