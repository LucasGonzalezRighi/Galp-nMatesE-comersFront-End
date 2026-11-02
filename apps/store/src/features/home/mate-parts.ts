/** Una parte del mate de la foto del collage de reseñas. */
export type MatePart = 'boca' | 'virola' | 'bombilla' | 'cuero' | 'pie'

/** Un punto dentro del recorte cuadrado de la foto: fracciones de 0 a 1 de su lado. */
export interface CropPoint {
  x: number
  y: number
}

/** Dónde está una parte en la foto y de qué lado del collage van sus notas. */
interface MatePartInfo {
  /** Rótulo de la nota. */
  label: string
  /** Adonde llega el hilo de la nota. */
  spot: CropPoint
  /** Columna de notas que le queda más cerca. */
  side: NoteSide
  /** Lo que ocupa la parte: un rectángulo, o un trazo con su grosor (la bombilla). */
  area:
    | { box: readonly [number, number, number, number] }
    | { path: readonly CropPoint[]; radius: number }
  /** Palabras que la nombran, en el texto sin tildes y en minúsculas. */
  words: RegExp
}

/** Columna de notas del collage. */
export type NoteSide = 'left' | 'right'

/**
 * La foto del collage: `/hero/world/pieces.jpg` (1600 × 893), un mate de cuero con virola de
 * alpaca, la bombilla apoyada y el pie con pelotitas. El collage muestra un recorte cuadrado de
 * 750 px desde (455, 95), con el mate en el centro.
 */
export const COLLAGE_PHOTO = {
  src: '/hero/world/pieces.jpg',
  width: 1600,
  height: 893,
  cropX: 455,
  cropY: 95,
  cropSize: 750,
} as const

/** Las partes, con las medidas tomadas sobre la foto (en fracciones del recorte). */
export const MATE_PARTS: Readonly<Record<MatePart, MatePartInfo>> = {
  boca: {
    label: 'Sobre la boca',
    spot: { x: 0.447, y: 0.231 },
    side: 'left',
    area: { box: [0.273, 0.2, 0.633, 0.267] },
    words: /\bboca\b|\bceba|\bcurad|\bcure\b|\byerba\b|\bcalabaza\b/,
  },
  virola: {
    label: 'Sobre la virola',
    spot: { x: 0.327, y: 0.327 },
    side: 'left',
    area: { box: [0.227, 0.273, 0.713, 0.393] },
    words: /\bvirola|\bcincelad/,
  },
  bombilla: {
    label: 'Sobre la bombilla',
    spot: { x: 0.6, y: 0.16 },
    side: 'right',
    area: {
      path: [
        { x: 0.6, y: 0.147 },
        { x: 0.78, y: 0.5 },
        { x: 0.927, y: 0.86 },
      ],
      radius: 0.053,
    },
    words: /\bbombill|\bpico\b|\bfiltro\b|\btira\b|\bse tapa\b/,
  },
  cuero: {
    label: 'Sobre el cuero',
    spot: { x: 0.633, y: 0.54 },
    side: 'right',
    area: { box: [0.213, 0.393, 0.707, 0.727] },
    words: /\bcuero\b|\bcostura|\bpelo\b|\bforrad/,
  },
  pie: {
    label: 'Sobre el pie',
    spot: { x: 0.476, y: 0.897 },
    side: 'left',
    area: { box: [0.247, 0.74, 0.673, 0.927] },
    words: /\bpie\b|\bpelotitas\b|\bpatitas\b|\bpatas\b|\bbase\b/,
  },
}

/** Las partes, en el orden de la foto de arriba abajo (para recorrerlas en las pruebas y el collage). */
export const PART_ORDER: readonly MatePart[] = ['bombilla', 'boca', 'virola', 'cuero', 'pie']

/** Lo mínimo de una reseña para saber de qué parte habla. */
export interface PartSource {
  text: string
  product: { name: string }
}

/** El texto en minúsculas y sin tildes, para buscar palabras con `\b`. */
function plain(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/**
 * La parte del mate de la que habla una reseña: la que nombra primero en el texto ("La virola es
 * una joya y el pie..." es de la virola). Si no nombra ninguna, la del producto: las bombillas van a
 * la bombilla, las yerbas a la boca (donde se ve la yerba) y los mates al cuero.
 *
 * @param review - El texto de la reseña y el nombre del producto.
 * @returns La parte del mate.
 * @example
 * partOfReview({ text: 'Las patitas no rayan la mesa.', product: { name: 'Mate Imperial' } }) // 'pie'
 */
export function partOfReview(review: PartSource): MatePart {
  const text = plain(review.text)
  let best: { part: MatePart; index: number } | null = null
  for (const part of PART_ORDER) {
    const index = text.search(MATE_PARTS[part].words)
    if (index >= 0 && (best === null || index < best.index)) best = { part, index }
  }
  if (best !== null) return best.part
  const product = plain(review.product.name)
  if (product.includes('bombill')) return 'bombilla'
  if (product.includes('yerba')) return 'boca'
  return 'cuero'
}

/**
 * Si el centro de una celda del recorte cae sobre una parte (con media celda de margen en los
 * rectángulos, así la celda que la toca de costado también se ilumina).
 *
 * @param part - La parte.
 * @param point - El centro de la celda, en fracciones del recorte.
 * @param half - Media celda, en fracciones del recorte.
 * @returns `true` si la celda muestra esa parte.
 */
export function cellShowsPart(part: MatePart, point: CropPoint, half: number): boolean {
  const { area } = MATE_PARTS[part]
  if ('box' in area) {
    const [x1, y1, x2, y2] = area.box
    return point.x > x1 - half && point.x < x2 + half && point.y > y1 - half && point.y < y2 + half
  }
  return area.path.some((start, index) => {
    const end = area.path[index + 1] ?? start
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = dx * dx + dy * dy
    const t =
      length === 0
        ? 0
        : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / length))
    return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy)) < area.radius
  })
}

/** Una nota ubicada en el collage. */
export interface PlacedNote<T> {
  /** La reseña. */
  item: T
  /** De qué parte habla. */
  part: MatePart
  /** En qué columna va. */
  side: NoteSide
  /** Su lugar en la columna, desde 0 (arriba). */
  slot: number
}

/** Cuántas notas entran por columna. */
export const NOTES_PER_SIDE = 5

/**
 * Reparte las reseñas en las dos columnas del collage: cada una del lado de su parte, parejas (si
 * un lado tiene dos o más de más, pasa al otro la nota cuya parte queda más cerca del centro) y,
 * dentro de cada columna, en el orden de la foto de arriba abajo. Entran hasta cinco por lado.
 *
 * @param items - Las reseñas, en el orden en que llegan.
 * @param partOf - De qué parte habla cada una.
 * @returns Las notas de la columna izquierda y de la derecha, con su lugar.
 */
export function placeNotes<T>(
  items: readonly T[],
  partOf: (item: T) => MatePart,
): Record<NoteSide, PlacedNote<T>[]> {
  const notes = items.map((item, index) => {
    const part = partOf(item)
    return { item, part, side: MATE_PARTS[part].side, index }
  })
  const count = (side: NoteSide): number => notes.filter((note) => note.side === side).length
  for (;;) {
    const heavy: NoteSide = count('left') > count('right') ? 'left' : 'right'
    const light: NoteSide = heavy === 'left' ? 'right' : 'left'
    if (count(heavy) - count(light) < 2) break
    // La que queda más cerca del centro: la de x más grande si sobra a la izquierda.
    const sign = heavy === 'left' ? 1 : -1
    const candidate = notes
      .filter((note) => note.side === heavy)
      .reduce((best, note) =>
        sign * MATE_PARTS[note.part].spot.x > sign * MATE_PARTS[best.part].spot.x ||
        (MATE_PARTS[note.part].spot.x === MATE_PARTS[best.part].spot.x && note.index > best.index)
          ? note
          : best,
      )
    candidate.side = light
  }
  const column = (side: NoteSide): PlacedNote<T>[] =>
    notes
      .filter((note) => note.side === side)
      .sort((a, b) => MATE_PARTS[a.part].spot.y - MATE_PARTS[b.part].spot.y || a.index - b.index)
      .slice(0, NOTES_PER_SIDE)
      .map(({ item, part }, slot) => ({ item, part, side, slot }))
  return { left: column('left'), right: column('right') }
}
