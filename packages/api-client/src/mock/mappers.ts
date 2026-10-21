import type { Pesos, ProductSortOrder } from '@galpon/domain'
import {
  averageRating,
  FERRULES,
  formatProductCode,
  isPurchasable,
  LEATHERS,
  maxQuantity,
  netPrice,
  pesos,
  sortProducts,
} from '@galpon/domain'
import type {
  AdminProduct,
  AdminSettings,
  Category,
  ProductDetail,
  ProductSummary,
  PublicSettings,
  Review,
} from '../generated/schema'
import type { MockCategory, MockDb, MockProduct, MockReview } from './types'

/** Convierte el precio de un producto en un monto, o `null` si es "a consultar". */
function toPesos(priceArs: number | null): Pesos | null {
  return priceArs === null ? null : pesos(priceArs)
}

/** Reseñas aprobadas de un producto, de la más nueva a la más vieja. */
export function approvedReviews(db: MockDb, productId: string): MockReview[] {
  return db.reviews
    .filter((review) => review.productId === productId && review.status === 'approved')
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

/** Productos publicados, por código. */
export function publishedProducts(db: MockDb): MockProduct[] {
  return db.products
    .filter((product) => product.status === 'published')
    .sort((a, b) => a.sequence - b.sequence)
}

/**
 * Busca un producto por su slug actual o por uno anterior.
 *
 * @param products - Productos entre los que buscar.
 * @param slug - Slug pedido; si coincide con el actual de un producto, gana sobre los anteriores.
 */
export function findBySlug(
  products: readonly MockProduct[],
  slug: string,
): MockProduct | undefined {
  return (
    products.find((product) => product.slug === slug) ??
    products.find((product) => product.previousSlugs.includes(slug))
  )
}

/** Línea de un producto; si no existe es un error de la base, no del pedido. */
function categoryOf(product: MockProduct, db: MockDb): MockCategory {
  const category = db.categories.find((candidate) => candidate.id === product.categoryId)
  if (category === undefined) {
    throw new Error(
      `El producto ${product.id} apunta a una línea que no existe (${product.categoryId}).`,
    )
  }
  return category
}

/**
 * Ordena productos de la base con el orden del catálogo de `domain`.
 *
 * @param products - Productos, ya en el orden de código (el orden es estable).
 * @param order - Criterio de orden.
 */
export function sortMockProducts(
  products: readonly MockProduct[],
  order: ProductSortOrder,
): MockProduct[] {
  const keyed = products.map((product) => ({
    product,
    name: product.name,
    featured: product.featured,
    priceArs: toPesos(product.priceArs),
  }))
  return sortProducts(keyed, order).map(({ product }) => product)
}

/**
 * Arma una línea como la devuelve la API, con la cantidad de productos publicados.
 *
 * @param category - Línea de la base.
 * @param db - Base simulada.
 */
export function toCategory(category: MockCategory, db: MockDb): Category {
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    group: category.group,
    blurb: category.blurb,
    position: category.position,
    image: category.image,
    productCount: publishedProducts(db).filter((product) => product.categoryId === category.id)
      .length,
  }
}

/**
 * Arma un producto como se muestra en listados: código, agotado, precio sin impuestos y calificación.
 *
 * @param product - Producto de la base.
 * @param db - Base simulada.
 */
export function toProductSummary(product: MockProduct, db: MockDb): ProductSummary {
  const category = categoryOf(product, db)
  const price = toPesos(product.priceArs)
  const ratings = approvedReviews(db, product.id).map((review) => review.rating)
  return {
    id: product.id,
    slug: product.slug,
    code: formatProductCode(product.sequence),
    name: product.name,
    description: product.description,
    categoryId: category.id,
    categoryName: category.name,
    categorySlug: category.slug,
    group: category.group,
    priceArs: product.priceArs,
    netPriceArs:
      db.settings.priceDisplay.showNetPrice && price !== null
        ? netPrice(price, db.settings.vatRatePercent)
        : null,
    isPurchasable: isPurchasable({ status: product.status, priceArs: price, stock: product.stock }),
    isSoldOut: product.stock === 0,
    maxQuantity: maxQuantity(product.stock),
    featured: product.featured,
    mainImage: product.images[0] ?? null,
    rating: { average: averageRating(ratings), count: ratings.length },
  }
}

/**
 * Arma la ficha de un producto: fotos, opciones (solo los mates) y pestañas.
 *
 * Las pestañas Materiales y Cuidado usan el texto propio del producto si lo tiene y, si no, el de
 * su grupo.
 *
 * @param product - Producto de la base.
 * @param db - Base simulada.
 */
export function toProductDetail(product: MockProduct, db: MockDb): ProductDetail {
  const summary = toProductSummary(product, db)
  const tabs = db.content.productTabs
  const groupTabs = tabs[summary.group]
  return {
    ...summary,
    images: product.images,
    options: summary.group === 'mate' ? { ferrules: [...FERRULES], leathers: [...LEATHERS] } : null,
    tabs: {
      descriptionNote: groupTabs.descriptionNote,
      materials: product.tabsOverride?.materials ?? groupTabs.materials,
      shipping: tabs.shipping,
      care: product.tabsOverride?.care ?? groupTabs.care,
    },
  }
}

/**
 * Arma una reseña como la ve el público (sin estado de moderación ni producto).
 *
 * @param review - Reseña de la base.
 */
export function toReview(review: MockReview): Review {
  return {
    id: review.id,
    authorName: review.authorName,
    rating: review.rating,
    text: review.text,
    createdAt: review.createdAt,
    verifiedPurchase: review.verifiedPurchase,
  }
}

/**
 * Deja solo los ajustes públicos: nunca la alícuota de IVA ni el umbral de stock bajo.
 *
 * @param settings - Ajustes completos de la tienda.
 */
export function toPublicSettings(settings: AdminSettings): PublicSettings {
  return {
    kitDiscountPercent: settings.kitDiscountPercent,
    shippingOptions: settings.shippingOptions,
    installments: settings.installments,
    contactEmail: settings.contactEmail,
    priceDisplay: settings.priceDisplay,
    seller: settings.seller,
  }
}

/**
 * Arma un producto como lo ve el dashboard: la ficha más estado, stock, slugs anteriores y fechas.
 *
 * Los textos propios de las pestañas faltantes salen como `null`. La base no guarda la fecha de
 * última modificación, así que `updatedAt` es la de alta.
 *
 * @param product - Producto de la base.
 * @param db - Base simulada.
 */
export function toAdminProduct(product: MockProduct, db: MockDb): AdminProduct {
  return {
    ...toProductDetail(product, db),
    sequence: product.sequence,
    status: product.status,
    stock: product.stock,
    tabsOverride:
      product.tabsOverride === null
        ? null
        : {
            materials: product.tabsOverride.materials ?? null,
            care: product.tabsOverride.care ?? null,
          },
    previousSlugs: [...product.previousSlugs],
    createdAt: product.createdAt,
    updatedAt: product.createdAt,
  }
}
