import type { KitProduct } from '../kit-products'

/**
 * Producto del kit para los tests: un mate comprable de $10.000 con stock 10, salvo lo que se cambie.
 *
 * @param overrides - Campos que cambian; `id` es obligatorio.
 */
export function kitProduct(overrides: Partial<KitProduct> & { id: string }): KitProduct {
  return {
    slug: overrides.id,
    name: `Producto ${overrides.id}`,
    group: 'mate',
    categoryName: 'Imperiales',
    priceArs: 10000,
    maxQuantity: 10,
    isPurchasable: true,
    image: null,
    ...overrides,
  }
}

/** Catálogo de los tests: dos mates, dos bombillas y dos yerbas comprables, más un mate sin stock. */
export const CATALOG: KitProduct[] = [
  kitProduct({ id: 'm1', slug: 'mate-uno', name: 'Mate Imperial Premium', priceArs: 39999 }),
  kitProduct({ id: 'm2', slug: 'mate-dos', name: 'Mate Torpedo', categoryName: 'Torpedos' }),
  kitProduct({
    id: 'm3',
    slug: 'mate-agotado',
    name: 'Mate Agotado',
    isPurchasable: false,
    maxQuantity: 0,
  }),
  kitProduct({
    id: 'b1',
    slug: 'bombillon-curvo',
    name: 'Bombillón Curvo',
    group: 'bombilla',
    categoryName: 'Bombillones',
    priceArs: 25999,
  }),
  kitProduct({
    id: 'b2',
    slug: 'bombillon-recto',
    name: 'Bombillón Recto',
    group: 'bombilla',
    categoryName: 'Bombillones',
  }),
  kitProduct({
    id: 'y1',
    slug: 'yerba-clasica',
    name: 'Yerba Canarias',
    group: 'yerba',
    categoryName: 'Yerbas',
    priceArs: 9999,
  }),
  kitProduct({
    id: 'y2',
    slug: 'yerba-te-jengibre',
    name: 'Yerba Té y Jengibre',
    group: 'yerba',
    categoryName: 'Yerbas',
  }),
]
