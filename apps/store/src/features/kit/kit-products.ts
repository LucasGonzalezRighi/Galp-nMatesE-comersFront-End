import type { ProductSummary } from '@galpon/api-client'
import type { ProductGroup } from '@galpon/domain'

/**
 * Lo que necesita el kit de un producto: lo mínimo del listado de la API para mostrar la opción
 * y para pasarla al carrito (es compatible con `CartableProduct` de la feature del carrito).
 */
export interface KitProduct {
  /** Id del producto. */
  id: string
  /** Slug, para elegir el mate de `/kit?mate=`. */
  slug: string
  /** Nombre del producto. */
  name: string
  /** Grupo: mate, bombilla o yerba. */
  group: ProductGroup
  /** Nombre de la línea, que se muestra sobre el nombre. */
  categoryName: string
  /** Precio de lista, o `null` si es "a consultar" (esos no son opciones del kit). */
  priceArs: number | null
  /** Máximo que se puede pedir de una vez: el menor entre 20 y el stock. */
  maxQuantity: number
  /** Si se puede comprar (publicado, con precio y con stock). */
  isPurchasable: boolean
  /** Foto principal, o `null` si todavía no tiene. */
  image: { url: string; alt: string } | null
}

/**
 * Reduce un producto del listado a lo que usa el kit.
 *
 * @param product - Producto del listado de la API.
 * @returns El producto del kit.
 */
export function toKitProduct(product: ProductSummary): KitProduct {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    group: product.group,
    categoryName: product.categoryName,
    priceArs: product.priceArs,
    maxQuantity: product.maxQuantity,
    isPurchasable: product.isPurchasable,
    image:
      product.mainImage === null
        ? null
        : { url: product.mainImage.url, alt: product.mainImage.alt },
  }
}

/**
 * Deja solo los productos comprables, que son las únicas opciones del kit (spec 9.5), en el
 * orden del catálogo.
 *
 * @param products - Productos del listado de la API.
 * @returns Los comprables, ya reducidos con {@link toKitProduct}.
 */
export function kitProductsFrom(products: readonly ProductSummary[]): KitProduct[] {
  return products.filter((product) => product.isPurchasable).map(toKitProduct)
}
