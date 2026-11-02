import type { MockCategory } from '../types'
import { MATE_IMPERIAL_PREMIUM_IMAGE } from './products'

/** Las 6 líneas del diseño (lista `CATS`); solo Imperiales tiene la foto del mate. */
export const FIXTURE_CATEGORIES: readonly MockCategory[] = [
  {
    id: 'cat-imperiales',
    slug: 'imperiales',
    name: 'Imperiales',
    group: 'mate',
    blurb: 'Boca ancha, virola de alpaca y pie de apoyo. El mate de ceremonia.',
    position: 1,
    image: { ...MATE_IMPERIAL_PREMIUM_IMAGE },
  },
  {
    id: 'cat-torpedos',
    slug: 'torpedos',
    name: 'Torpedos',
    group: 'mate',
    blurb: 'Silueta alargada, cuero cosido y virola cincelada. Un clásico con carácter.',
    position: 2,
    image: null,
  },
  {
    id: 'cat-camioneros',
    slug: 'camioneros',
    name: 'Camioneros',
    group: 'mate',
    blurb: 'Boca amplia y base firme, para cebar en cualquier lado.',
    position: 3,
    image: null,
  },
  {
    id: 'cat-ranchero',
    slug: 'ranchero',
    name: 'Ranchero y Galleta',
    group: 'mate',
    blurb: 'Formatos criollos, cueros con pelo y terminaciones cálidas.',
    position: 4,
    image: null,
  },
  {
    id: 'cat-bombillones',
    slug: 'bombillones',
    name: 'Bombillones',
    group: 'bombilla',
    blurb: 'Alpaca cincelada y picos de bronce, en 15 y 18 cm.',
    position: 5,
    image: null,
  },
  {
    id: 'cat-yerbas',
    slug: 'yerbas',
    name: 'Yerbas',
    group: 'yerba',
    blurb: 'Canarias tradicional, Serena y Té y Jengibre, en paquetes de 1 kg.',
    position: 6,
    image: null,
  },
]
