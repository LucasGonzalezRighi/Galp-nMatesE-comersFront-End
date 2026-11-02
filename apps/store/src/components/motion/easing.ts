import { tokens } from '@galpon/design-tokens'

/** Curva cúbica de Bézier en la forma que espera Motion: `[x1, y1, x2, y2]`. */
export type Bezier = readonly [number, number, number, number]

/** `cubic-bezier(x1, y1, x2, y2)` con números decimales (sin notación científica). */
const CUBIC_BEZIER =
  /^cubic-bezier\(\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*\)$/

/**
 * Convierte una curva CSS `cubic-bezier(...)` en la tupla que usa Motion.
 *
 * @param css - Curva en CSS, por ejemplo `cubic-bezier(.16,1,.3,1)`.
 * @returns Los cuatro números de la curva, en el mismo orden.
 * @throws {RangeError} Si el texto no tiene esa forma o si `x1` o `x2` quedan fuera de 0 a 1.
 * @example
 * parseCubicBezier('cubic-bezier(.16,1,.3,1)') // [0.16, 1, 0.3, 1]
 */
export function parseCubicBezier(css: string): Bezier {
  const match = CUBIC_BEZIER.exec(css.trim())
  if (match === null) {
    throw new RangeError(`La curva "${css}" no tiene la forma cubic-bezier(x1, y1, x2, y2).`)
  }
  const [, x1, y1, x2, y2] = match.map(Number)
  if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
    throw new RangeError(`La curva "${css}" no tiene cuatro valores.`)
  }
  if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) {
    throw new RangeError(`En la curva "${css}", x1 y x2 tienen que estar entre 0 y 1.`)
  }
  return [x1, y1, x2, y2]
}

/** Curva principal de las animaciones (`tokens.easing.main`). */
export const EASE_MAIN: Bezier = parseCubicBezier(tokens.easing.main)

/** Curva elástica, con rebote (`tokens.easing.spring`). */
export const EASE_SPRING: Bezier = parseCubicBezier(tokens.easing.spring)

/** Curva de la cortina entre páginas, tomada del diseño (aún no es un token). */
export const EASE_CURTAIN: Bezier = [0.7, 0, 0.3, 1]

/** Curva con que se dibuja el check, tomada del diseño (aún no es un token). */
export const EASE_DRAW: Bezier = [0.65, 0, 0.35, 1]

/**
 * Curva con que se abren la intro y el telón (Ruling MR-31): arranca suave, acelera en el medio
 * y llega frenando suave, sin quedarse quieta al final como lo hace {@link EASE_MAIN}.
 */
export const EASE_OPEN: Bezier = [0.65, 0, 0.35, 1]
