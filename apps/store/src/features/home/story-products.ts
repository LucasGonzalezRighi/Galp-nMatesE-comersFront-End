import type { HomeContent, ProductSummary } from '@galpon/api-client'
import type { ProductGroup } from '@galpon/domain'

/** Los productos que muestra la historia del inicio, ya resueltos contra el catálogo. */
export interface StoryProducts {
  /** El mate de la portada y de la escena de las tres piezas, o `null` si no hay ningún mate comprable. */
  hero: ProductSummary | null
  /** Las bombillas de la escena del bombillón (hasta las que elige el contenido). */
  bombillas: ProductSummary[]
  /** Las yerbas de la escena de la yerba (hasta las que elige el contenido). */
  yerbas: ProductSummary[]
}

/**
 * Elige, para cada slug pedido, un producto comprable de ese grupo. Un slug que se puede comprar
 * se respeta; uno que no (no existe, es de otro grupo, no tiene precio o no tiene stock) se
 * reemplaza por el siguiente comprable de su grupo en el orden del catálogo, dando la vuelta al
 * principio si hace falta y sin repetir otro producto de la lista. Si el grupo no tiene
 * suficientes comprables, la lista queda más corta.
 */
function pickGroup(
  slugs: readonly string[],
  group: ProductGroup,
  products: readonly ProductSummary[],
): ProductSummary[] {
  const inGroup = products.filter((product) => product.group === group)
  const used = new Set<string>()
  // Primero se fijan las elecciones válidas, así un reemplazo no les gana el lugar.
  const chosen = slugs.map((slug) => {
    const product = inGroup.find((candidate) => candidate.slug === slug)
    if (product?.isPurchasable !== true || used.has(product.id)) return null
    used.add(product.id)
    return product
  })
  const picked: ProductSummary[] = []
  slugs.forEach((slug, position) => {
    const keep = chosen[position]
    if (keep !== null && keep !== undefined) {
      picked.push(keep)
      return
    }
    // El siguiente al que no sirvió; si ese slug no está en el grupo, desde el principio.
    const start = inGroup.findIndex((candidate) => candidate.slug === slug)
    for (let step = 1; step <= inGroup.length; step += 1) {
      const candidate = inGroup[(start + step) % inGroup.length]
      if (candidate !== undefined && candidate.isPurchasable && !used.has(candidate.id)) {
        used.add(candidate.id)
        picked.push(candidate)
        return
      }
    }
  })
  return picked
}

/**
 * Resuelve los productos de las escenas 1, 3 y 4 de la historia (spec 9.5): los que elige
 * `HomeContent.storyProducts`, con el siguiente comprable de su grupo cuando alguno no se puede
 * comprar, así la historia nunca ofrece una pieza sin stock ni "a consultar".
 *
 * @param storyProducts - Los slugs que elige el contenido editable del inicio.
 * @param products - Productos publicados, en el orden del catálogo.
 * @returns El mate de la portada (`null` si no hay ninguno comprable) y las bombillas y yerbas.
 * @example
 * resolveStoryProducts(content.storyProducts, products).hero?.name // "Mate Imperial Premium"
 */
export function resolveStoryProducts(
  storyProducts: HomeContent['storyProducts'],
  products: readonly ProductSummary[],
): StoryProducts {
  return {
    hero: pickGroup([storyProducts.hero], 'mate', products)[0] ?? null,
    bombillas: pickGroup(storyProducts.bombillas, 'bombilla', products),
    yerbas: pickGroup(storyProducts.yerbas, 'yerba', products),
  }
}
