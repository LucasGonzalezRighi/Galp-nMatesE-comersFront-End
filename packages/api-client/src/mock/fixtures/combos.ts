import type { MockCombo } from '../types'

/**
 * Combos de ejemplo (reporte de diseño, sección 9, y decisión IC-14): cuatro publicados con las
 * piezas que tienen foto y un borrador con el Mate Galleta, que no tiene stock. Los precios
 * terminan en 999 y quedan entre 9 y 11 % debajo de la suma de las piezas, cerca del kit.
 */
export const FIXTURE_COMBOS: readonly MockCombo[] = [
  {
    id: 'cmb-duo-imperial',
    name: 'Dúo Imperial',
    description: 'El imperial de ceremonia con el bombillón curvo de pico de bronce.',
    // $39.999 + $28.999 = $68.998: ahorra $6.999.
    productIds: ['prd-imperial-premium', 'prd-bombillon-premium-curvo'],
    priceArs: 61999,
    status: 'published',
    position: 1,
  },
  {
    id: 'cmb-camionero-y-canarias',
    name: 'Camionero y Canarias',
    description: 'Boca amplia, virola de aluminio y un kilo de Canarias para arrancar.',
    // $24.999 + $9.999 = $34.998: ahorra $3.499.
    productIds: ['prd-camionero-aluminio', 'prd-yerba-canarias'],
    priceArs: 31499,
    status: 'published',
    position: 2,
  },
  {
    id: 'cmb-torpedo-completo',
    name: 'Torpedo completo',
    description:
      'Las tres piezas ya elegidas: torpedo cincelado, bombillón de alpaca y Canarias Serena.',
    // $37.999 + $25.999 + $12.500 = $76.498: ahorra $8.499.
    productIds: ['prd-torpedo-borravino', 'prd-bombillon-100-alpaca', 'prd-yerba-serena'],
    priceArs: 67999,
    status: 'published',
    position: 3,
  },
  {
    id: 'cmb-bombilla-y-yerba',
    name: 'Bombilla y yerba',
    description: 'Para el que ya tiene su mate: bombillón de alpaca y Canarias Té y Jengibre.',
    // $25.999 + $12.500 = $38.499: ahorra $3.500. Sin mate, no pide cuero ni virola.
    productIds: ['prd-bombillon-100-alpaca', 'prd-yerba-jengibre'],
    priceArs: 34999,
    status: 'published',
    position: 4,
  },
  {
    id: 'cmb-galleta-y-canarias',
    name: 'Galleta y Canarias',
    description: 'El galleta de siempre con un kilo de Canarias.',
    // $27.999 + $9.999 = $37.998: ahorra $3.999. Borrador; el Mate Galleta no tiene stock.
    productIds: ['prd-galleta', 'prd-yerba-canarias'],
    priceArs: 33999,
    status: 'draft',
    position: 5,
  },
]
