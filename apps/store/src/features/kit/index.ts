/**
 * "Armá tu kit" (spec 9.4 y 9.5): asistente de tres pasos más Resumen con un store propio en
 * memoria. La página (`/kit`) trae el catálogo y los ajustes, y compone `KitHero` y `KitBuilder`;
 * `/kit?mate={slug}` elige el mate si es comprable.
 *
 * @packageDocumentation
 */
export type { KitBuilderProps } from './KitBuilder'
export type { KitHeroProps } from './KitHero'
export type { KitProduct } from './kit-products'
export { KitBuilder } from './KitBuilder'
export { KitHero } from './KitHero'
export { kitProductsFrom, toKitProduct } from './kit-products'
