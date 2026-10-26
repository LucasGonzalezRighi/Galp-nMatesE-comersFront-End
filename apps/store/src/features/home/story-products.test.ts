import { describe, expect, it } from 'vitest'
import { resolveStoryProducts } from './story-products'
import { loadFixtureCatalog, withProduct } from './test/fixture-catalog'

/** Los slugs de una lista de productos, para comparar. */
function slugs(products: readonly { slug: string }[]): string[] {
  return products.map((product) => product.slug)
}

describe('resolveStoryProducts', () => {
  it('usa los productos que elige el contenido cuando todos se pueden comprar', async () => {
    const { products, content } = await loadFixtureCatalog()
    const story = resolveStoryProducts(content.storyProducts, products)
    expect(story.hero?.slug).toBe(content.storyProducts.hero)
    expect(slugs(story.bombillas)).toEqual(content.storyProducts.bombillas)
    expect(slugs(story.yerbas)).toEqual(content.storyProducts.yerbas)
  })

  it('reemplaza una bombilla sin stock por la siguiente comprable de su grupo, sin repetir', async () => {
    const { products, content } = await loadFixtureCatalog()
    const [first, second] = content.storyProducts.bombillas
    if (first === undefined || second === undefined) throw new Error('Faltan bombillas.')
    const soldOut = withProduct(products, first, { isPurchasable: false, isSoldOut: true })
    const story = resolveStoryProducts(content.storyProducts, soldOut)
    expect(story.bombillas).toHaveLength(2)
    expect(story.bombillas.every((product) => product.isPurchasable)).toBe(true)
    expect(story.bombillas.every((product) => product.group === 'bombilla')).toBe(true)
    // La otra elegida se conserva y el reemplazo no es ninguna de las dos.
    expect(slugs(story.bombillas)).toContain(second)
    expect(slugs(story.bombillas)).not.toContain(first)
    expect(new Set(slugs(story.bombillas)).size).toBe(2)
  })

  it('reemplaza un mate sin precio (a consultar) por otro mate comprable', async () => {
    const { products, content } = await loadFixtureCatalog()
    const toConsult = withProduct(products, content.storyProducts.hero, {
      isPurchasable: false,
      priceArs: null,
      netPriceArs: null,
    })
    const story = resolveStoryProducts(content.storyProducts, toConsult)
    expect(story.hero).not.toBeNull()
    expect(story.hero?.slug).not.toBe(content.storyProducts.hero)
    expect(story.hero?.group).toBe('mate')
    expect(story.hero?.isPurchasable).toBe(true)
  })

  it('toma el siguiente en el orden del catálogo y, si no hay más adelante, vuelve al principio', async () => {
    const { products, content } = await loadFixtureCatalog()
    const yerbas = products.filter((product) => product.group === 'yerba')
    const last = yerbas.at(-1)
    if (last === undefined) throw new Error('Faltan yerbas.')
    // La última yerba del listado ya no se puede comprar: el reemplazo da la vuelta al principio.
    const story = resolveStoryProducts(
      { ...content.storyProducts, yerbas: [last.slug] },
      withProduct(products, last.slug, { isPurchasable: false }),
    )
    expect(slugs(story.yerbas)).toEqual([yerbas[0]?.slug])
  })

  it('reemplaza un slug que ya no existe por un producto comprable del grupo de la escena', async () => {
    const { products, content } = await loadFixtureCatalog()
    const story = resolveStoryProducts(
      { ...content.storyProducts, yerbas: ['yerba-que-no-existe'] },
      products,
    )
    expect(story.yerbas).toHaveLength(1)
    expect(story.yerbas[0]?.group).toBe('yerba')
    expect(story.yerbas[0]?.isPurchasable).toBe(true)
  })

  it('no usa un producto de otro grupo aunque el slug exista', async () => {
    const { products, content } = await loadFixtureCatalog()
    const story = resolveStoryProducts(
      { ...content.storyProducts, hero: content.storyProducts.yerbas[0] ?? '' },
      products,
    )
    expect(story.hero?.group).toBe('mate')
  })

  it('deja la escena con menos productos (o sin mate) si el grupo no tiene nada comprable', async () => {
    const { products, content } = await loadFixtureCatalog()
    const withoutMatesAndBombillas = products.map((product) =>
      product.group === 'yerba' ? product : { ...product, isPurchasable: false },
    )
    const story = resolveStoryProducts(content.storyProducts, withoutMatesAndBombillas)
    expect(story.hero).toBeNull()
    expect(story.bombillas).toEqual([])
    expect(story.yerbas).toHaveLength(3)
  })

  it('con el catálogo vacío no devuelve nada', async () => {
    const { content } = await loadFixtureCatalog()
    expect(resolveStoryProducts(content.storyProducts, [])).toEqual({
      hero: null,
      bombillas: [],
      yerbas: [],
    })
  })
})
