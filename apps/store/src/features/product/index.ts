/**
 * Ficha de producto (spec 9.5): migas, galería, precio, stock, opciones de los mates, compra,
 * pestañas, banda del kit y relacionados, más las lecturas cacheadas del servidor y los
 * metadatos y datos estructurados de la página.
 *
 * La página `/producto/[slug]` usa `ProductPage` (que busca la ficha con `findProduct`: un slug
 * inválido o inexistente responde `notFound()` y uno anterior redirige al actual), y
 * `getProductParams` y `getProductMetadata` para `generateStaticParams` y `generateMetadata`. La
 * ficha incluye las reseñas de la feature `reviews`.
 *
 * @packageDocumentation
 */
export type { ProductDetailViewProps } from './ProductDetailView'
export type { ProductGalleryProps } from './ProductGallery'
export type { ProductJsonLdProps } from './ProductJsonLd'
export type { ProductPageProps } from './ProductPage'
export type { ProductPurchaseProps } from './ProductPurchase'
export type { ProductTab, ProductTabsProps } from './ProductTabs'
export type { RelatedProductsProps } from './RelatedProducts'
export { ProductDetailView } from './ProductDetailView'
export { ProductGallery } from './ProductGallery'
export { ProductJsonLd } from './ProductJsonLd'
export { ProductPage } from './ProductPage'
export { ProductPurchase } from './ProductPurchase'
export { ProductTabs } from './ProductTabs'
export { RelatedProducts } from './RelatedProducts'
export {
  findProduct,
  getProductReviews,
  getRelatedProducts,
  getTabsContent,
  listProductSlugs,
} from './product.data'
export { getProductMetadata, getProductParams, PRODUCT_PLACEHOLDER_SLUG } from './product.route'
export {
  buildMissingProductMetadata,
  buildProductJsonLd,
  buildProductMetadata,
  serializeJsonLd,
} from './product-seo'
export { buildProductTabs } from './product-tabs'
