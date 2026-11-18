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

/** Tiempos del dibujo de la intro: el matecito y la palabra arrancan juntos, en 0. */
export interface StrokeTiming {
  /** Cuánto tarda el matecito (0 a 1,2 s). */
  markMs: number
  /** Cuánto tarda la palabra entera, también desde 0 (0 a 2,4 s). */
  writeMs: number
  /** Cuánto tarda cada letra; se solapan un poco para que entren en `writeMs`. */
  letterMs: number
}

/**
 * El guion de la intro (Ruling AI-1): el matecito y GALPÓN arrancan juntos; el matecito termina a
 * 1,2 s y GALPÓN a 2,4 s, ~0,46 s por letra (cada una se solapa ~70 ms con la siguiente).
 */
export const STROKE_TIMING: StrokeTiming = { markMs: 1200, writeMs: 2400, letterMs: 460 }

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
 * Arma el orden y los tiempos del trazado de la intro (Ruling AI-1): el matecito (su contorno, con
 * la boca a mitad de camino y la bombilla al final del contorno) y GALPÓN arrancan juntos. El
 * matecito termina en `markMs`; GALPÓN va letra por letra de izquierda a derecha (por `minX`),
 * cada letra solapada un poco con la siguiente y con sus huecos dibujándose junto con ella, y la
 * última termina justo en `writeMs`.
 *
 * @param mark - Los subtrazos del matecito.
 * @param word - Los subtrazos de la palabra.
 * @param timing - Los tiempos; por defecto, {@link STROKE_TIMING}.
 * @returns Un paso por subtrazo: los del matecito y después los de la palabra, cada grupo en el
 *   orden en que empieza a dibujarse.
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
    ...schedule(glyphs(word, 'la palabra'), 0, writeMs, letterMs),
  ]
}
