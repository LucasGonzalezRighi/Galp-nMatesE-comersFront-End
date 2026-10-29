import { slugify } from '@galpon/domain'
import type { Image } from '../../generated/schema'
import type { MockProduct } from '../types'

/**
 * Arma una foto de ejemplo de un producto. El archivo está en `public/mock-images/` de la tienda y
 * también del admin (cada app sirve las fotos desde su propio origen), con el slug como nombre.
 *
 * @param slug - Slug del producto (`slugify(name)`).
 * @param width - Ancho real del archivo, en píxeles.
 * @param height - Alto real del archivo, en píxeles.
 * @param alt - Texto alternativo.
 * @param position - Lugar en la galería desde la segunda foto (`2` → `{slug}-2.jpg`); la principal no lo lleva.
 * @returns La foto, con `publicId` `galpon/productos/{archivo}` y `url` `/mock-images/{archivo}.jpg`.
 * @example
 * productImage('mate-imperial-premium', 352, 462, 'Mate…', 2).url // "/mock-images/mate-imperial-premium-2.jpg"
 */
function productImage(
  slug: string,
  width: number,
  height: number,
  alt: string,
  position?: number,
): Image {
  const file = position === undefined ? slug : `${slug}-${String(position)}`
  return {
    publicId: `galpon/productos/${file}`,
    url: `/mock-images/${file}.jpg`,
    width,
    height,
    alt,
  }
}

/** Foto principal del Mate Imperial Premium, la que trae el diseño; también es la foto de la línea Imperiales. */
export const MATE_IMPERIAL_PREMIUM_IMAGE: Image = productImage(
  'mate-imperial-premium',
  960,
  1280,
  'Mate Imperial Premium con virola de alpaca cincelada y base con pelotitas de bronce',
)

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

/**
 * Los 27 productos del diseño, en el orden de `P`. Las fotos son las que mandó el cliente: 16
 * productos tienen al menos una (la primera es la principal); el resto muestra el placeholder.
 */
const DESIGN_PRODUCTS: readonly DesignProduct[] = [
  {
    id: 'imperial-premium',
    category: 'imperiales',
    name: 'Mate Imperial Premium',
    description: 'Imperial con virola y base de alpaca con pelotitas en bronce.',
    priceArs: 39999,
    featured: true,
    images: [
      MATE_IMPERIAL_PREMIUM_IMAGE,
      productImage(
        'mate-imperial-premium',
        352,
        462,
        'Mate Imperial Premium con virola cincelada, base con pelotitas de bronce y una bombilla de pico de bronce al costado',
        2,
      ),
    ],
  },
  {
    id: 'imperial-calabaza',
    category: 'imperiales',
    name: 'Mate Imperial de Calabaza',
    description:
      'Mate de calabaza forrado en cuero negro, con virola de alpaca labrada con diseño floral y pie de apoyo.',
    priceArs: 24999,
    images: [
      productImage(
        'mate-imperial-de-calabaza',
        358,
        475,
        'Mate imperial de calabaza forrado en cuero negro, con virola de alpaca labrada con flores y base de cuatro patas',
      ),
    ],
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
    images: [
      productImage(
        'mate-imperial-criollo',
        358,
        469,
        'Mate imperial de calabaza pulida con virola de alpaca cincelada y funda de cuero crudo con costura cruzada',
      ),
    ],
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
    images: [
      productImage(
        'mate-torpedo-virola-de-alpaca-cincelada',
        338,
        396,
        'Mate torpedo negro con virola de alpaca cincelada festoneada y bombilla de pico de bronce, sobre un mantel blanco',
      ),
      productImage(
        'mate-torpedo-virola-de-alpaca-cincelada',
        354,
        475,
        'Detalle de la virola de alpaca cincelada y de la bombilla de pico de bronce apoyada en el mate',
        2,
      ),
      productImage(
        'mate-torpedo-virola-de-alpaca-cincelada',
        354,
        462,
        'El mate torpedo con la bombilla de pico de bronce apoyada de costado, que deja ver la pala',
        3,
      ),
    ],
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
    images: [
      productImage(
        'torpedo-crudo-con-base-y-anillos',
        356,
        472,
        'Mate torpedo de calabaza pulida con base de cuero crudo atada con tiento',
      ),
    ],
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
    images: [
      productImage(
        'torpedo-alpaca-cincelada-c-cuero',
        356,
        475,
        'Mate torpedo de cuero negro con costuras a la vista, virola de alpaca cincelada con grecas y patas de apoyo',
      ),
    ],
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
    images: [
      productImage(
        'camionero-criollo',
        684,
        359,
        'Manos sosteniendo un mate camionero de cuero con yerba y bombilla, al aire libre',
      ),
    ],
  },
  {
    id: 'camionero-aluminio',
    category: 'camioneros',
    name: 'Camionero Virola de Aluminio',
    description: 'Camionero de cuero negro y calabaza natural.',
    priceArs: 24999,
    images: [
      productImage(
        'camionero-virola-de-aluminio',
        358,
        471,
        'Mate camionero de cuero negro texturado con virola lisa de aluminio y base de tres patas',
      ),
    ],
  },
  {
    id: 'ranchero-manchas',
    category: 'ranchero',
    name: 'Mate Ranchero Manchas Blancas',
    description: 'Ranchero con cuero de manchas blancas. Muuu.',
    priceArs: 31999,
    featured: true,
    images: [
      productImage(
        'mate-ranchero-manchas-blancas',
        358,
        474,
        'Mate ranchero de calabaza pintada de blanco, con manchas naturales y tachas plateadas',
      ),
    ],
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
    images: [
      productImage(
        'mate-coquito-criollo',
        354,
        480,
        'Mate coquito de calabaza redonda con base de cuero natural cosida con hilo negro',
      ),
    ],
  },
  {
    id: 'yerba-canarias',
    category: 'yerbas',
    name: 'Yerba Canarias 1 kg',
    description: 'Canarias tradicional. Paquete de 1 kg.',
    priceArs: 9999,
    images: [
      productImage(
        'yerba-canarias-1-kg',
        360,
        475,
        'Paquete amarillo de yerba mate Canarias sabor tradicional, de 1 kg',
      ),
    ],
  },
  {
    id: 'yerba-serena',
    category: 'yerbas',
    name: 'Yerba Canarias Serena 1 kg',
    description: 'Canarias Serena, suave y con hierbas. Paquete de 1 kg.',
    priceArs: 12500,
    featured: true,
    images: [
      productImage(
        'yerba-canarias-serena-1-kg',
        318,
        473,
        'Paquete verde de yerba mate Canarias Serena, compuesta con hierbas, de 1 kg',
      ),
    ],
  },
  {
    id: 'yerba-jengibre',
    category: 'yerbas',
    name: 'Yerba Canarias Té y Jengibre 1 kg',
    description: 'Canarias con té y jengibre. Paquete de 1 kg.',
    priceArs: 12500,
    images: [
      productImage(
        'yerba-canarias-te-y-jengibre-1-kg',
        466,
        462,
        'Paquete de yerba mate Canarias con té verde y jengibre, de 1 kg',
      ),
    ],
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
    images: [
      productImage(
        'bombillon-100-alpaca',
        326,
        450,
        'Bombillón de alpaca cincelada con pico curvo, parado en el exhibidor de Galpón',
      ),
    ],
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
    images: [
      productImage(
        'bombillon-premium-curvo',
        344,
        461,
        'Bombillón de alpaca torzada con pico curvo de bronce, parado en el exhibidor de Galpón',
      ),
    ],
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
    images: [
      productImage(
        'bombillon-alpaca-pico-loro-18-cm',
        344,
        465,
        'Mate torpedo negro con un bombillón de pico loro de bronce y dos más apoyados sobre la mesa',
      ),
    ],
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
  updatedAt: CREATED_AT,
}))
