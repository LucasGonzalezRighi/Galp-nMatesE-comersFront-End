/** Un punto del espacio de la escena (en mundo, sin `three`). */
export interface StreamPoint {
  /** Horizontal: hacia la derecha de la pantalla. */
  readonly x: number
  /** Vertical: hacia arriba. */
  readonly y: number
  /** Profundidad: hacia la cámara. */
  readonly z: number
}

/**
 * Cuánto camino horizontal llevan los dos controles intermedios al bajar un tercio y dos tercios de
 * la caída: los de un tiro (`√⅓` y `√⅔`). El chorro sale del pico con impulso y se cierra hacia el
 * hueco cayendo casi vertical.
 */
const CONTROL_SHARES = [Math.sqrt(1 / 3), Math.sqrt(2 / 3)] as const

/** Lanza `RangeError` si algún número del punto no es finito. */
function assertFinitePoint(point: StreamPoint, name: string): void {
  if (![point.x, point.y, point.z].every(Number.isFinite)) {
    throw new RangeError(
      `El punto ${name} del chorro tiene que tener x, y y z finitos; se recibió (${String(point.x)}, ${String(point.y)}, ${String(point.z)}).`,
    )
  }
}

/** Un valor de la Catmull-Rom uniforme entre `p1` y `p2` (con `p0` y `p3` de vecinos), en `v` de 0 a 1. */
function catmullRom(p0: number, p1: number, p2: number, p3: number, v: number): number {
  return (
    0.5 *
    (2 * p1 +
      (p2 - p0) * v +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * v * v +
      (3 * p1 - p0 - 3 * p2 + p3) * v * v * v)
  )
}

/** Interpola entre dos puntos. */
function lerpPoint(from: StreamPoint, to: StreamPoint, share: number): StreamPoint {
  return {
    x: from.x + (to.x - from.x) * share,
    y: from.y + (to.y - from.y) * share,
    z: from.z + (to.z - from.z) * share,
  }
}

/**
 * Los puntos del chorro del termo, de la boca del pico (`from`) al hueco (`to`): una Catmull-Rom
 * uniforme que pasa por los dos extremos y por dos controles intermedios. Los controles bajan en
 * tercios parejos (así la altura decrece siempre, sin rebotes) y corren el camino horizontal como un
 * tiro: mucho al salir del pico y casi nada al final, donde el chorro cae vertical sobre el hueco.
 *
 * @param from - La boca del pico, en mundo.
 * @param to - Donde cae el chorro (junto a la bombilla, en el hueco), en mundo; más abajo que `from`.
 * @param count - Cuántos puntos devolver, extremos incluidos; un entero de 2 o más.
 * @returns `count` puntos nuevos, el primero igual a `from` y el último igual a `to`, con la altura
 * decreciente de uno al siguiente.
 * @throws {RangeError} Si `count` no es un entero mayor o igual a 2, si algún punto no es finito o si
 * `to` no está más abajo que `from`.
 * @example
 * streamPoints({ x: 1, y: 1, z: 0 }, { x: 0, y: 0, z: 0 }, 3)[1] // { x: ≈0.28, y: 0.5, z: 0 }
 */
export function streamPoints(from: StreamPoint, to: StreamPoint, count: number): StreamPoint[] {
  if (!Number.isInteger(count) || count < 2) {
    throw new RangeError(
      `El chorro necesita una cantidad entera de 2 puntos o más; se recibió ${String(count)}.`,
    )
  }
  assertFinitePoint(from, 'de partida')
  assertFinitePoint(to, 'de llegada')
  if (!(to.y < from.y)) {
    throw new RangeError(
      `El chorro cae: el punto de llegada tiene que estar más abajo que el de partida; se recibió ${String(to.y)} contra ${String(from.y)}.`,
    )
  }

  // Los controles: la altura baja en tercios parejos y el camino horizontal sigue al tiro.
  const [firstShare, secondShare] = CONTROL_SHARES
  const firstControl = { ...lerpPoint(from, to, firstShare), y: from.y + (to.y - from.y) / 3 }
  const secondControl = {
    ...lerpPoint(from, to, secondShare),
    y: from.y + ((to.y - from.y) * 2) / 3,
  }
  // Los vecinos de los extremos, reflejados: la curva empieza y termina sin desviarse.
  const before = lerpPoint(from, firstControl, -1)
  const after = lerpPoint(secondControl, to, 2)
  const knots = [before, from, firstControl, secondControl, to, after] as const

  return Array.from({ length: count }, (_, index) => {
    if (index === 0) return { ...from }
    if (index === count - 1) return { ...to }
    const u = (index / (count - 1)) * 3
    const segment = Math.min(2, Math.floor(u))
    const v = u - segment
    const a = knots[segment] ?? from
    const b = knots[segment + 1] ?? from
    const c = knots[segment + 2] ?? to
    const d = knots[segment + 3] ?? to
    return {
      x: catmullRom(a.x, b.x, c.x, d.x, v),
      y: catmullRom(a.y, b.y, c.y, d.y, v),
      z: catmullRom(a.z, b.z, c.z, d.z, v),
    }
  })
}
