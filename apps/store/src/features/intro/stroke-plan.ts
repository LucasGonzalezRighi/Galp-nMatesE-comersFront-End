/** Lo que el plan necesita de cada subtrazo del logo. */
export interface StrokeShape {
  /** Identificador de la pieza. */
  id: string
  /** Borde izquierdo: ordena las letras. */
  minX: number
  /** Si es un hueco: se dibuja con la letra que tiene a su izquierda. */
  hole: boolean
}

/** Cuándo empieza y cuánto dura el trazo de una pieza, desde que arranca el dibujo. */
export interface StrokeStep {
  /** Identificador de la pieza. */
  id: string
  /** Retraso desde el comienzo del dibujo, en milisegundos. */
  delayMs: number
  /** Duración del trazo, en milisegundos. */
  durationMs: number
}

/** Tiempos del dibujo de la intro. */
export interface StrokeTiming {
  /** Cuánto tarda el matecito (0 a 1,4 s). */
  markMs: number
  /** Cuánto tarda la palabra entera (1,4 a 3,4 s). */
  writeMs: number
  /** Cuánto tarda cada letra; se solapan un poco para que entren en `writeMs`. */
  letterMs: number
}

/** El guion del video de referencia: el matecito en 1,4 s y GALPÓN en 2 s, ~0,38 s por letra. */
export const STROKE_TIMING: StrokeTiming = { markMs: 1400, writeMs: 2000, letterMs: 380 }

/** Dónde arranca un hueco dentro del trazo de su letra, y cuánto dura, en fracción de la letra. */
const HOLE_START = 0.4
const HOLE_LENGTH = 0.35

/** Una letra: su contorno y los huecos que lleva. */
interface Glyph {
  outline: StrokeShape
  holes: StrokeShape[]
}

/** Ordena las piezas por `minX` y junta cada hueco con la letra que tiene a su izquierda. */
function glyphs(shapes: readonly StrokeShape[], what: string): Glyph[] {
  if (shapes.length === 0) throw new RangeError(`${what} no tiene trazos.`)
  const sorted = [...shapes].sort((a, b) => a.minX - b.minX)
  const result: Glyph[] = []
  for (const shape of sorted) {
    if (!Number.isFinite(shape.minX)) {
      throw new RangeError(`El trazo "${shape.id}" de ${what} no tiene un minX finito.`)
    }
    const last = result.at(-1)
    if (!shape.hole) result.push({ outline: shape, holes: [] })
    else if (last === undefined) {
      throw new RangeError(`El hueco "${shape.id}" de ${what} no tiene una letra a su izquierda.`)
    } else last.holes.push(shape)
  }
  return result
}

/** Reparte las letras en `spanMs` desde `startMs`, cada una de `glyphMs`, con sus huecos. */
function schedule(list: Glyph[], startMs: number, spanMs: number, glyphMs: number): StrokeStep[] {
  const stagger = list.length > 1 ? (spanMs - glyphMs) / (list.length - 1) : 0
  return list.flatMap((glyph, index) => {
    const delayMs = Math.round(startMs + index * stagger)
    return [
      { id: glyph.outline.id, delayMs, durationMs: glyphMs },
      ...glyph.holes.map((hole) => ({
        id: hole.id,
        delayMs: Math.round(delayMs + glyphMs * HOLE_START),
        durationMs: Math.round(glyphMs * HOLE_LENGTH),
      })),
    ]
  })
}

/**
 * Arma el orden y los tiempos del trazado de la intro: primero el matecito (su contorno, con la
 * boca a mitad de camino y la bombilla al final del contorno), después GALPÓN letra por letra
 * de izquierda a derecha (por `minX`), cada letra solapada un poco con la siguiente y con sus
 * huecos dibujándose junto con ella. La última letra termina justo en `markMs + writeMs`.
 *
 * @param mark - Los subtrazos del matecito.
 * @param word - Los subtrazos de la palabra.
 * @param timing - Los tiempos; por defecto, {@link STROKE_TIMING}.
 * @returns Un paso por subtrazo, en el orden en que empiezan a dibujarse.
 * @throws {RangeError} Si alguna lista está vacía, un `minX` no es finito, un hueco no tiene una
 *   letra a su izquierda, o los tiempos no son positivos o la letra dura más que la palabra.
 */
export function planStrokes(
  mark: readonly StrokeShape[],
  word: readonly StrokeShape[],
  timing: StrokeTiming = STROKE_TIMING,
): StrokeStep[] {
  const { markMs, writeMs, letterMs } = timing
  if (![markMs, writeMs, letterMs].every((value) => Number.isFinite(value) && value > 0)) {
    throw new RangeError('Los tiempos del trazado tienen que ser números finitos positivos.')
  }
  if (letterMs > writeMs) {
    throw new RangeError(
      `Cada letra (${String(letterMs)} ms) no puede durar más que la palabra (${String(writeMs)} ms).`,
    )
  }
  return [
    ...schedule(glyphs(mark, 'el matecito'), 0, markMs, markMs),
    ...schedule(glyphs(word, 'la palabra'), markMs, writeMs, letterMs),
  ]
}
