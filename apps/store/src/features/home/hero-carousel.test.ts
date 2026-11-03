import { describe, expect, it } from 'vitest'
import type { ProductSummary } from '@galpon/api-client'
import type { ProductGroup } from '@galpon/domain'
import type { StoryProducts } from './story-products'
import { HERO_SLIDE_COUNT, heroCounter, heroSlides, heroWord, stackLook } from './hero-carousel'
import { buildHomeData } from './home-data'
import { heroSlideAnnouncement, heroViewLabel } from './home.copy'
import { loadFixtureCatalog } from './test/fixture-catalog'

/** Los nombres de una lista de productos, para comparar. */
function names(products: readonly ProductSummary[]): string[] {
  return products.map((product) => product.name)
}

/** La historia y los destacados del catálogo de fábrica. */
async function fixture(): Promise<{ story: StoryProducts; featured: ProductSummary[] }> {
  const data = buildHomeData(await loadFixtureCatalog())
  return { story: data.story, featured: data.featured }
}

describe('heroSlides (Ruling IC-7)', () => {
  it('con el catálogo de fábrica da las cinco piezas del v4, con el mate destacado que no es la portada', async () => {
    const { story, featured } = await fixture()
    expect(names(heroSlides(story, featured))).toEqual([
      'Mate Imperial Premium',
      'Bombillón Premium Curvo',
      'Yerba Canarias 1 kg',
      'Mate Torpedo Premium',
      'Bombillón 100% Alpaca',
    ])
    expect(HERO_SLIDE_COUNT).toBe(5)
  })

  it('no repite piezas: una que ya está se saltea y se completa con los destacados', async () => {
    const { story, featured } = await fixture()
    const [bombilla] = story.bombillas
    if (bombilla === undefined) throw new Error('Faltan bombillas.')
    const slides = heroSlides({ ...story, bombillas: [bombilla, bombilla] }, featured)
    expect(slides).toHaveLength(HERO_SLIDE_COUNT)
    expect(new Set(slides.map((product) => product.id)).size).toBe(HERO_SLIDE_COUNT)
    // El quinto lugar lo toma el primer destacado que todavía no está.
    expect(slides.at(-1)?.name).toBe('Torpedo Crudo con Base y Anillos')
  })

  it('sin bombillas ni yerbas completa hasta cinco con los destacados, en su orden', async () => {
    const { story, featured } = await fixture()
    const slides = heroSlides({ hero: story.hero, bombillas: [], yerbas: [] }, featured)
    expect(names(slides)).toEqual([
      'Mate Imperial Premium',
      'Mate Torpedo Premium',
      'Torpedo Crudo con Base y Anillos',
      'Mate Camionero Criollo con Pelo',
      'Mate Ranchero Manchas Blancas',
    ])
  })

  it('sin mate de portada arranca por la bombilla, y con pocas piezas la lista queda más corta', async () => {
    const { story } = await fixture()
    const slides = heroSlides({ ...story, hero: null }, [])
    expect(names(slides)).toEqual([
      'Bombillón Premium Curvo',
      'Yerba Canarias 1 kg',
      'Bombillón 100% Alpaca',
    ])
    expect(heroSlides({ hero: null, bombillas: [], yerbas: [] }, [])).toEqual([])
  })
})

describe('heroWord', () => {
  it('es la palabra gigante del grupo de la pieza actual', () => {
    expect(heroWord('mate')).toBe('Mates')
    expect(heroWord('bombilla')).toBe('Bombillas')
    expect(heroWord('yerba')).toBe('Yerba')
  })

  it('rechaza un grupo que no existe', () => {
    expect(() => heroWord('termo' as ProductGroup)).toThrow(RangeError)
  })
})

describe('heroCounter', () => {
  it('cuenta desde 1, con dos cifras y una raya', () => {
    expect(heroCounter(0, 5)).toBe('01 — 05')
    expect(heroCounter(1, 5)).toBe('02 — 05')
    expect(heroCounter(4, 5)).toBe('05 — 05')
  })

  it('rechaza una posición fuera de la lista o una cantidad inválida', () => {
    expect(() => heroCounter(5, 5)).toThrow(RangeError)
    expect(() => heroCounter(-1, 5)).toThrow(RangeError)
    expect(() => heroCounter(0.5, 5)).toThrow(RangeError)
    expect(() => heroCounter(0, 0)).toThrow(RangeError)
  })
})

describe('stackLook', () => {
  it('con giro (desde 768 px) es la tabla del v4: la actual al frente y la que sale por delante', () => {
    expect([0, 1, 2, 3, 4].map((distance) => stackLook(distance, 5, false))).toEqual([
      { x: 0, y: 0, scale: 1, rotateY: 0, opacity: 1, z: 5 },
      { x: 34, y: 4, scale: 0.84, rotateY: -16, opacity: 0.6, z: 4 },
      { x: 58, y: 8, scale: 0.7, rotateY: -24, opacity: 0.28, z: 3 },
      { x: 76, y: 10, scale: 0.6, rotateY: -28, opacity: 0, z: 2 },
      { x: -18, y: 0, scale: 1.04, rotateY: 10, opacity: 0, z: 6 },
    ])
  })

  it('plana (celular) solo corre y achica, sin girar', () => {
    expect([0, 1, 2, 3, 4].map((distance) => stackLook(distance, 5, true))).toEqual([
      { x: 0, y: 0, scale: 1, rotateY: 0, opacity: 1, z: 5 },
      { x: 30, y: 4, scale: 0.86, rotateY: 0, opacity: 0.6, z: 4 },
      { x: 52, y: 8, scale: 0.74, rotateY: 0, opacity: 0.28, z: 3 },
      { x: 70, y: 10, scale: 0.64, rotateY: 0, opacity: 0, z: 2 },
      { x: -18, y: 0, scale: 1.04, rotateY: 0, opacity: 0, z: 6 },
    ])
  })

  it('con dos tarjetas ninguna sale: la otra espera detrás', () => {
    expect(stackLook(1, 2, false)).toEqual({
      x: 34,
      y: 4,
      scale: 0.84,
      rotateY: -16,
      opacity: 0.6,
      z: 4,
    })
  })

  it('rechaza una distancia fuera de la pila o una cantidad inválida', () => {
    expect(() => stackLook(5, 5, true)).toThrow(RangeError)
    expect(() => stackLook(-1, 5, false)).toThrow(RangeError)
    expect(() => stackLook(1.5, 5, false)).toThrow(RangeError)
    expect(() => stackLook(0, 0, false)).toThrow(RangeError)
  })
})

describe('textos de la portada del v4', () => {
  it('nombra el link a la ficha y anuncia la pieza nueva con su posición', () => {
    expect(heroViewLabel('Mate Imperial Premium')).toBe('Ver pieza: Mate Imperial Premium')
    expect(heroSlideAnnouncement('Bombillón Premium Curvo', 2, 5)).toBe(
      'Bombillón Premium Curvo, pieza 2 de 5',
    )
  })

  it('rechaza una posición fuera de la lista', () => {
    expect(() => heroSlideAnnouncement('Mate', 0, 5)).toThrow(RangeError)
    expect(() => heroSlideAnnouncement('Mate', 6, 5)).toThrow(RangeError)
    expect(() => heroSlideAnnouncement('Mate', 1, 0)).toThrow(RangeError)
  })
})
