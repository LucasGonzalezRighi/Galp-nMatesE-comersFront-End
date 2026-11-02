/** Cuánto se acerca la escena al estado objetivo en un cuadro de 1/60 s (el 0,055 del diseño). */
export const SMOOTHING = 0.055

/**
 * La parte del camino hacia el estado objetivo que la escena recorre en un cuadro de `dt` segundos:
 * `1 − (1 − 0,055)^(dt·60)`. A 60 cuadros por segundo es el 5,5 % del diseño y, como depende del
 * tiempo y no de los cuadros, la escena se mueve igual de rápido a 30, 60 o 144 Hz.
 *
 * @param dt - Segundos desde el cuadro anterior; 0 o más.
 * @returns La parte del camino, de 0 a 1 (para `lerpMateState`).
 * @throws {RangeError} Si `dt` no es un número finito mayor o igual a 0.
 * @example
 * smoothingShare(1 / 60) // 0.055
 */
export function smoothingShare(dt: number): number {
  if (!Number.isFinite(dt) || dt < 0) {
    throw new RangeError(
      `El tiempo del cuadro tiene que ser un número de segundos mayor o igual a 0; se recibió ${String(dt)}.`,
    )
  }
  return 1 - (1 - SMOOTHING) ** (dt * 60)
}
