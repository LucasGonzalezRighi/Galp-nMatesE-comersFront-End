import { slugify } from '@galpon/domain'
import type { Image } from '../../generated/schema'
import type { MockProduct } from '../types'

/** Foto del Mate Imperial Premium: la única que trae el diseño, también se usa como foto de la línea Imperiales. */
export const MATE_IMPERIAL_PREMIUM_IMAGE: Image = {
  publicId: 'galpon/productos/mate-imperial-premium',
  url: '/mock-images/mate-imperial-premium.jpg',
  width: 960,
  height: 1280,
  alt: 'Mate Imperial Premium con virola de alpaca cincelada y base con pelotitas de bronce',
}

/** Producto como lo define la lista `P` del diseño; el resto de los campos vale lo mismo para todos. */
interface DesignProduct {
  /** Identificador del diseño, sin el prefijo `prd-`. */
  id: string
  /** Identificador de la línea del diseño, sin el prefijo `cat-`. */
  category: string
  /** Nombre del producto. */
  name: string
  /** Descripción del producto. */
  description: string
  /** Precio en pesos enteros, o `null` cuando se consulta por mail. */
  priceArs: number | null
  /** Si el diseño lo marca como destacado. */
  featured?: boolean
  /** Unidades disponibles; si falta, `DEFAULT_STOCK`. */
  stock?: number
  /** Fotos del producto; si falta, no tiene. */
  images?: Image[]
}

/** Unidades disponibles de los productos que el diseño no marca como agotados o casi agotados. */
const DEFAULT_STOCK = 12

/** Fecha de alta de todos los productos de ejemplo. */
const CREATED_AT = '2026-09-01T12:00:00Z'

/** Los 27 productos del diseño, en el orden de `P`. */
const DESIGN_PRODUCTS: readonly DesignProduct[] = [
  {
    id: 'imperial-premium',
    category: 'imperiales',
    name: 'Mate Imperial Premium',
    description: 'Imperial con virola y base de alpaca con pelotitas en bronce.',
    priceArs: 39999,
    featured: true,
    images: [MATE_IMPERIAL_PREMIUM_IMAGE],
  },
  {
    id: 'imperial-calabaza',
    category: 'imperiales',
    name: 'Mate Imperial de Calabaza',
    description:
      'Mate de calabaza forrado en cuero negro, con virola de alpaca labrada con diseño floral y pie de apoyo.',
    priceArs: 24999,
  },
  {
    id: 'imperial-termico',
    category: 'imperiales',
    name: 'Mate Imperial Térmico',
    description: 'El formato imperial en versión térmica.',
    priceArs: 28999,
  },
  {
    id: 'imperial-criollo',
    category: 'imperiales',
    name: 'Mate Imperial Criollo',
    description:
      'Imperial de calabaza pulida con virola de alpaca cincelada y funda de cuero marrón con costura artesanal.',
    priceArs: 29999,
  },
  {
    id: 'torpedo-premium',
    category: 'torpedos',
    name: 'Mate Torpedo Premium',
    description:
      'Interior de calabaza forrado en cuero premium y virola de alpaca cincelada. Base en alpaca y bronce.',
    priceArs: 39999,
    featured: true,
  },
  {
    id: 'torpedo-borravino',
    category: 'torpedos',
    name: 'Mate Torpedo Virola de Alpaca Cincelada',
    description:
      'Torpedo de calabaza con virola de alpaca cincelada, cuero liso borravino y base ancha de alpaca.',
    priceArs: 37999,
  },
  {
    id: 'torpedo-acero',
    category: 'torpedos',
    name: 'Mate Torpedo Línea Acero',
    description:
      'Línea ACERO, con virola de acero inoxidable cincelada y acabado negro. Su formato torpedo le da un diseño clásico y distintivo.',
    priceArs: null,
  },
  {
    id: 'torpedo-crudo',
    category: 'torpedos',
    name: 'Torpedo Crudo con Base y Anillos',
    description:
      'Torpedo de alpaca cincelada forrado en cuero crudo, con base en cuero y doble anillo de bronce.',
    priceArs: 43000,
    featured: true,
  },
  {
    id: 'torpedo-cincelada',
    category: 'torpedos',
    name: 'Mate Torpedo Virola en Alpaca Cincelada',
    description: 'Torpedo con virola en alpaca cincelada.',
    priceArs: 37999,
  },
  {
    id: 'torpedo-repujado',
    category: 'torpedos',
    name: 'Torpedo Alpaca Cincelada c/Cuero',
    description: 'Torpedo premium con virola de alpaca cincelada y cuero repujado.',
    priceArs: 36999,
  },
  {
    id: 'camionero-pelo',
    category: 'camioneros',
    name: 'Mate Camionero Criollo con Pelo',
    description:
      'Camionero de calabaza natural, con boca amplia y base de cuero con pelo y costura cruzada.',
    priceArs: 19999,
    featured: true,
  },
  {
    id: 'camionero-criollo',
    category: 'camioneros',
    name: 'Camionero Criollo',
    description:
      'Camionero de cuero con base de cuero repujada, de estilo criollo y terminación artesanal.',
    priceArs: 22999,
  },
  {
    id: 'camionero-aluminio',
    category: 'camioneros',
    name: 'Camionero Virola de Aluminio',
    description: 'Camionero de cuero negro y calabaza natural.',
    priceArs: 24999,
  },
  {
    id: 'ranchero-manchas',
    category: 'ranchero',
    name: 'Mate Ranchero Manchas Blancas',
    description: 'Ranchero con cuero de manchas blancas. Muuu.',
    priceArs: 31999,
    featured: true,
  },
  {
    id: 'galleta',
    category: 'ranchero',
    name: 'Mate Galleta',
    description: 'Mate artesanal de calabaza, con un diseño cálido y natural, con funda de cuero.',
    priceArs: 27999,
    stock: 0,
  },
  {
    id: 'coquito-criollo',
    category: 'ranchero',
    name: 'Mate Coquito Criollo',
    description: 'Coquito criollo de calabaza, compacto y de mano.',
    priceArs: 28999,
    stock: 2,
  },
  {
    id: 'yerba-canarias',
    category: 'yerbas',
    name: 'Yerba Canarias 1 kg',
    description: 'Canarias tradicional. Paquete de 1 kg.',
    priceArs: 9999,
  },
  {
    id: 'yerba-serena',
    category: 'yerbas',
    name: 'Yerba Canarias Serena 1 kg',
    description: 'Canarias Serena, suave y con hierbas. Paquete de 1 kg.',
    priceArs: 12500,
    featured: true,
  },
  {
    id: 'yerba-jengibre',
    category: 'yerbas',
    name: 'Yerba Canarias Té y Jengibre 1 kg',
    description: 'Canarias con té y jengibre. Paquete de 1 kg.',
    priceArs: 12500,
  },
  {
    id: 'bombillon-curvo-alpaca',
    category: 'bombillones',
    name: 'Bombillón Curvo de Alpaca',
    description: 'Bombillón curvo con aro de alpaca y pico de bronce.',
    priceArs: 28999,
  },
  {
    id: 'bombillon-100-alpaca',
    category: 'bombillones',
    name: 'Bombillón 100% Alpaca',
    description: 'Realizado íntegramente en alpaca, con pico curvo, caño cincelado y doble dije.',
    priceArs: 25999,
    featured: true,
  },
  {
    id: 'bombillon-mini-loro',
    category: 'bombillones',
    name: 'Bombillón Mini Premium Pico Loro (15 cm)',
    description: 'Bombillón de alpaca con pico loro de bronce y caño trabajado.',
    priceArs: 25999,
  },
  {
    id: 'bombillon-mini-alpaca',
    category: 'bombillones',
    name: 'Bombillón Mini Alpaca (15 cm)',
    description:
      'Diseño compacto con pico recto de bronce y caño labrado. Ideal para mates medianos y chicos.',
    priceArs: 25999,
  },
  {
    id: 'bombillon-premium-curvo',
    category: 'bombillones',
    name: 'Bombillón Premium Curvo',
    description: 'Pico de rey en bronce, caño trenzado de alpaca y doble anillo de bronce.',
    priceArs: 28999,
    featured: true,
  },
  {
    id: 'bombillon-alpaca-18',
    category: 'bombillones',
    name: 'Bombillón Alpaca (18 cm)',
    description:
      'Bombillón de alpaca con pico recto de bronce, caño labrado y detalles artesanales.',
    priceArs: 25999,
  },
  {
    id: 'bombillon-curvo',
    category: 'bombillones',
    name: 'Bombillón Curvo',
    description: '100% alpaca con caño trenzado, detalles labrados y tradicional pala uruguaya.',
    priceArs: 28999,
  },
  {
    id: 'bombillon-loro-18',
    category: 'bombillones',
    name: 'Bombillón Alpaca Pico Loro (18 cm)',
    description: 'Bombillón de alpaca con pico loro de bronce y caño torneado.',
    priceArs: 25999,
  },
]

/** Productos de ejemplo: los 27 del diseño, publicados, con `slug` igual a `slugify(name)`. */
export const FIXTURE_PRODUCTS: readonly MockProduct[] = DESIGN_PRODUCTS.map((product, index) => ({
  id: `prd-${product.id}`,
  slug: slugify(product.name),
  sequence: index + 1,
  categoryId: `cat-${product.category}`,
  name: product.name,
  description: product.description,
  priceArs: product.priceArs,
  stock: product.stock ?? DEFAULT_STOCK,
  featured: product.featured === true,
  status: 'published',
  images: (product.images ?? []).map((image) => ({ ...image })),
  tabsOverride: null,
  previousSlugs: [],
  createdAt: CREATED_AT,
}))
