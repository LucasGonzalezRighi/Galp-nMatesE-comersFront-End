/** Parte del tramo de cada parada en que el recorrido se queda quieto para leer (el resto desliza). */
export const HOLD_SHARE = 0.55

/** Dónde está el paseo del mate para un avance del scroll. */
export interface StageLayout {
  /** La parada actual: la que ocupa la mayor parte de la ventana (cambia a mitad del deslizamiento). */
  index: number
  /** Posición de la pista en anchos de ventana: 0, −1, −2… con decimales mientras desliza. */
  trackX: number
  /** Avance dentro de la parada quieta, de 0 a 1 (1 mientras se va y 0 mientras llega). */
  holdProgress: number
}

/** Curva cúbica que arranca y termina despacio. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

/**
 * Reparte el avance del scroll de la historia entre sus paradas. Cada parada ocupa un tramo igual:
 * el 55 % inicial se queda quieta ({@link HOLD_SHARE}) y el 45 % restante se desliza hacia la
 * siguiente con una curva suave. La última se queda quieta todo su tramo.
 *
 * @param progress - Avance del scroll de la sección, de 0 a 1; fuera de ese rango se recorta.
 * @param count - Cantidad de paradas, un entero mayor o igual a 1.
 * @returns La parada actual, la posición de la pista y el avance dentro de la parada quieta.
 * @throws {RangeError} Si `progress` no es un número o `count` no es un entero mayor o igual a 1.
 * @example
 * stageLayout(0.25, 4) // { index: 1, trackX: -1, holdProgress: 0 }
 */
export function stageLayout(progress: number, count: number): StageLayout {
  if (Number.isNaN(progress)) {
    throw new RangeError('El avance del scroll tiene que ser un número.')
  }
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError(
      `La cantidad de paradas tiene que ser un entero mayor o igual a 1; se recibió ${String(count)}.`,
    )
  }
  const scaled = Math.min(1, Math.max(0, progress)) * count
  const stop = Math.min(count - 1, Math.floor(scaled))
  const local = scaled - stop
  // `+ 0` evita el −0 de la primera parada.
  if (stop === count - 1) return { index: stop, trackX: -stop + 0, holdProgress: local }
  if (local <= HOLD_SHARE) {
    return { index: stop, trackX: -stop + 0, holdProgress: local / HOLD_SHARE }
  }
  const slide = easeInOutCubic((local - HOLD_SHARE) / (1 - HOLD_SHARE))
  const leaving = slide < 0.5
  return {
    index: leaving ? stop : stop + 1,
    trackX: -(stop + slide),
    holdProgress: leaving ? 1 : 0,
  }
}
