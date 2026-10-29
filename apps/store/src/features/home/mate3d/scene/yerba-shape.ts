/** Lo que define la forma de la yerba adentro del mate (los campos del estado, de 0 a 1). */
export interface YerbaShape {
  /** Volumen de yerba: 0 es el fondo curado y 1 llega a la virola. */
  readonly fill: number
  /** Pendiente: 1 es la yerba asentada contra la pared izquierda (`x < 0`), como la deja el vuelco. */
  readonly slope: number
  /** Pared: 1 es la cara derecha de la montañita cayendo recta, como después de sacudir. */
  readonly wall: number
}

/** Un punto en coordenadas del cuerpo del mate (`mate`, con el piso en `y = 0`). */
export interface YerbaPoint {
  readonly x: number
  readonly y: number
  readonly z: number
}

/** Radio de la superficie de la yerba en la boca (el `interiorRadius` del mate). */
export const YERBA_RADIUS = 0.4

/** Amplitud del grano: la superficie nunca se aparta más que esto de su forma lisa. */
export const GRAIN_AMPLITUDE = 0.006

/** Altura de la superficie sin yerba (`fill 0`), apenas sobre el fondo curado. */
const EMPTY_LEVEL = 0.6

/** Altura de la superficie llena (`fill 1`), al ras de la virola. */
const FULL_LEVEL = 0.985

/** El hueco nunca baja de acá: el fondo curado está en 0,56. */
const FLOOR_LEVEL = 0.57

/** Cuánto más abajo que la meseta queda el hueco derecho con `slope 1`. */
const HOLLOW_DEPTH = 0.22

/** Dónde cae la pared (el centro de la transición), sobre el eje `x`. */
const WALL_X = 0.05

/** Cuánto ondula la pared a lo largo de `z` (no es un corte recto de cuchillo). */
const WALL_WOBBLE = 0.012

/** Ancho de la transición con `wall 0` (pendiente natural) y con `wall 1` (pared recta). */
const NATURAL_WIDTH = 0.3
const STEEP_WIDTH = 0.04

/** El centro del hueco donde se calza la bombilla y cae el agua (`x`, `z`). */
const HOLLOW_X = 0.18
const HOLLOW_Z = 0.04

/** Las dos octavas del grano: frecuencia (por unidad), peso y corrimiento de cada una. */
const OCTAVES = [
  { frequency: 19, weight: 0.65, shift: 0 },
  { frequency: 43, weight: 0.35, shift: 17.3 },
] as const

/** Tolerancia del borde de la boca para errores de redondeo. */
const EDGE_TOLERANCE = 1e-9

/** Interpola entre dos números. */
function lerp(from: number, to: number, share: number): number {
  return from + (to - from) * share
}

/** La curva `smoothstep` entre dos bordes: 0 antes de `edge0`, 1 después de `edge1`. */
function smoothstep(edge0: number, edge1: number, value: number): number {
  const share = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)))
  return share * share * (3 - 2 * share)
}

/** Un valor fijo de −1 a 1 para cada nudo de la grilla del ruido (hash entero). */
function lattice(ix: number, iz: number, octave: number): number {
  let hash = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ Math.imul(octave, 1442695041)
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177)
  hash ^= hash >>> 16
  return ((hash >>> 0) / 4294967295) * 2 - 1
}

/** Ruido de valor suave de −1 a 1 (interpolación con `smoothstep` entre los nudos). */
function valueNoise(x: number, z: number, octave: number): number {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  const sx = smoothstep(0, 1, x - ix)
  const sz = smoothstep(0, 1, z - iz)
  const near = lerp(lattice(ix, iz, octave), lattice(ix + 1, iz, octave), sx)
  const far = lerp(lattice(ix, iz + 1, octave), lattice(ix + 1, iz + 1, octave), sx)
  return lerp(near, far, sz)
}

/** El grano fino de la superficie: dos octavas de ruido, de −`GRAIN_AMPLITUDE` a `GRAIN_AMPLITUDE`. */
function grain(x: number, z: number): number {
  let total = 0
  for (const [octave, { frequency, weight, shift }] of OCTAVES.entries()) {
    total += weight * valueNoise(x * frequency + shift, z * frequency - shift, octave)
  }
  return GRAIN_AMPLITUDE * total
}

/** Lanza `RangeError` si algún campo de la forma no es un número de 0 a 1. */
function assertShape(shape: YerbaShape): void {
  const fields = [
    ['fill', shape.fill],
    ['slope', shape.slope],
    ['wall', shape.wall],
  ] as const
  for (const [name, value] of fields) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new RangeError(
        `La forma de la yerba va de 0 a 1 en cada campo; ${name} vale ${String(value)}.`,
      )
    }
  }
}

/**
 * La altura de la superficie de la yerba en un punto de la boca, en coordenadas del cuerpo del
 * mate (`mate`, piso en `y = 0`). Es un campo de alturas: el nivel sale de `fill` (de 0,6 vacío a
 * 0,985 lleno); con `slope` la yerba queda asentada contra la pared izquierda (`x < 0`): la meseta
 * izquierda al nivel de `fill` y el hueco derecho hasta 0,22 más abajo (nunca bajo el fondo
 * curado), con la transición (`smoothstep`) centrada en `x = 0,05`, de 0,3 de ancho con `wall 0`
 * (pendiente natural) a 0,04 con `wall 1` (la pared recta). Encima, un grano fino de dos octavas
 * de ruido (±0,006) para que no se vea lisa. Es determinista: los mismos datos dan la misma altura.
 *
 * @param x - Coordenada `x` del punto (negativa a la izquierda, del lado de la meseta).
 * @param z - Coordenada `z` del punto.
 * @param shape - `fill`, `slope` y `wall`, de 0 a 1.
 * @returns La altura `y` de la superficie en ese punto.
 * @throws {RangeError} Si algún campo de `shape` no es un número de 0 a 1, o si el punto no es
 *   finito o cae fuera de la boca (más lejos que `YERBA_RADIUS` del centro).
 * @example
 * yerbaHeight(0, 0, { fill: 1, slope: 0, wall: 0 }) // 0.985 ± el grano
 */
export function yerbaHeight(x: number, z: number, shape: YerbaShape): number {
  assertShape(shape)
  if (!Number.isFinite(x) || !Number.isFinite(z)) {
    throw new RangeError(
      `El punto de la yerba tiene que ser finito; se recibió (${String(x)}, ${String(z)}).`,
    )
  }
  if (x * x + z * z > YERBA_RADIUS * YERBA_RADIUS + EDGE_TOLERANCE) {
    throw new RangeError(
      `El punto (${String(x)}, ${String(z)}) cae fuera de la boca del mate (radio ${String(YERBA_RADIUS)}).`,
    )
  }
  const level = lerp(EMPTY_LEVEL, FULL_LEVEL, shape.fill)
  const depth = Math.min(HOLLOW_DEPTH * shape.slope, Math.max(0, level - FLOOR_LEVEL))
  const width = lerp(NATURAL_WIDTH, STEEP_WIDTH, shape.wall)
  const wallX = WALL_X + WALL_WOBBLE * valueNoise(z * 7 + 3.1, 0.5, OCTAVES.length)
  const step = smoothstep(wallX - width / 2, wallX + width / 2, x)
  return level - depth * step + grain(x, z)
}

/**
 * El centro del hueco derecho, donde se calza la bombilla y cae el agua: `x 0,18`, `z 0,04` y la
 * altura de la superficie ahí ({@link yerbaHeight}), en coordenadas del cuerpo del mate.
 *
 * @param shape - `fill`, `slope` y `wall`, de 0 a 1.
 * @returns El punto del hueco.
 * @throws {RangeError} Si algún campo de `shape` no es un número de 0 a 1.
 * @example
 * hollowCenter({ fill: 1, slope: 1, wall: 1 }).y // 0.765 ± el grano
 */
export function hollowCenter(shape: YerbaShape): YerbaPoint {
  return { x: HOLLOW_X, y: yerbaHeight(HOLLOW_X, HOLLOW_Z, shape), z: HOLLOW_Z }
}
