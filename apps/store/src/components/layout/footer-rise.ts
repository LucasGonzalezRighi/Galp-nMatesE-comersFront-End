import { useSyncExternalStore } from 'react'

/*
 * El pie que sube por encima de las reseñas quietas del inicio (como el del portafolio de Lucas):
 * las cuentas de su entrada ligada al scroll y el aviso de que hay reseñas quietas debajo.
 *
 * `cover` es cuánto subió el pie: 0 cuando su borde de arriba asoma abajo de la ventana y 1 cuando
 * llegó al final de la página.
 */

/** Cuánto se desfasa el tramo de una fila respecto de la anterior. */
export const FOOTER_ROW_STAGGER = 0.12

/** Largo del tramo en que entra cada fila. */
export const FOOTER_ROW_SPAN = 0.45

/** Desde qué parte de la subida entra la palabra GALPÓN (la última). */
const WORD_FROM = 0.5

/**
 * Lleva un avance de scroll a la subida del pie: lo recorta de 0 a 1 y toma 0 si no es un número
 * (por ejemplo, mientras el pie no tiene alto). Así las cuentas de abajo nunca reciben uno inválido.
 *
 * @param progress - El avance que da `useScroll`.
 * @returns Un avance de 0 a 1.
 * @example
 * clampCover(1.0002) // 1
 */
export function clampCover(progress: number): number {
  return Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0
}

/** Exige un avance de la subida válido. */
function assertCover(cover: number): void {
  if (!Number.isFinite(cover) || cover < 0 || cover > 1) {
    throw new RangeError(
      `Cuánto subió el pie tiene que ser un número de 0 a 1; se recibió ${String(cover)}.`,
    )
  }
}

/**
 * La curva senoidal de entrada y salida (`-(cos(π·x) − 1) / 2`): arranca y termina sin velocidad.
 *
 * @param share - Avance del tramo; fuera de 0 a 1 se recorta.
 * @returns El avance con la curva, de 0 a 1.
 * @example
 * easeInOutSine(0.5) // 0.5
 */
export function easeInOutSine(share: number): number {
  const x = Math.min(1, Math.max(0, share))
  // Igual a `-(cos(π·x) − 1) / 2`, sin el −0 en x = 0.
  return (1 - Math.cos(Math.PI * x)) / 2
}

/**
 * Cuánto entró una fila del pie (la frase con el mail, cada grupo de links, el copyright): cada
 * una tiene su tramo de {@link FOOTER_ROW_SPAN}, que arranca en `0,12 + fila × 0,12`, con la curva
 * senoidal. Con las filas de 0 a 3, la última está entera en 0,93: antes de que el pie termine de
 * subir.
 *
 * @param cover - Cuánto subió el pie, de 0 a 1.
 * @param index - La fila, desde 0 (admite decimales para desfasar menos las columnas de una fila).
 * @returns Cuánto entró, de 0 (borrosa, abajo y transparente) a 1 (nítida y en su lugar).
 * @throws {RangeError} Si `cover` no es un número de 0 a 1 o `index` no es un número de 0 o más.
 * @example
 * footerRowShare(0.57, 0) // 1
 */
export function footerRowShare(cover: number, index: number): number {
  assertCover(cover)
  if (!Number.isFinite(index) || index < 0) {
    throw new RangeError(
      `La fila del pie tiene que ser un número de 0 o más; se recibió ${String(index)}.`,
    )
  }
  return easeInOutSine((cover - FOOTER_ROW_STAGGER - index * FOOTER_ROW_STAGGER) / FOOTER_ROW_SPAN)
}

/**
 * Cuánto entró la palabra GALPÓN, que llega última: de la mitad de la subida al final, con la
 * curva senoidal.
 *
 * @param cover - Cuánto subió el pie, de 0 a 1.
 * @returns Cuánto entró, de 0 (abajo, transparente y apagada) a 1 (en su lugar e iluminada).
 * @throws {RangeError} Si `cover` no es un número de 0 a 1.
 * @example
 * footerWordShare(0.75) // 0.5
 */
export function footerWordShare(cover: number): number {
  assertCover(cover)
  return easeInOutSine((cover - WORD_FROM) / (1 - WORD_FROM))
}

/** Cuántas reseñas quietas hay montadas (una en el inicio; ninguna en las demás páginas). */
let stages = 0

/** Quienes esperan saber si hay reseñas quietas. */
const listeners = new Set<() => void>()

/** Avisa el cambio a quienes esperan. */
function notify(): void {
  for (const listener of listeners) listener()
}

/**
 * Avisa que hay reseñas quietas debajo del pie (`FooterStage` del inicio): mientras dure, el pie
 * entra con sus filas en cascada y GALPÓN al final.
 *
 * @returns La función que retira el aviso (al desmontarse las reseñas).
 */
export function registerFooterStage(): () => void {
  stages += 1
  notify()
  let active = true
  return () => {
    if (!active) return
    active = false
    stages -= 1
    notify()
  }
}

/** Se suscribe a los cambios del aviso. */
function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Si hay reseñas quietas montadas. */
function getSnapshot(): boolean {
  return stages > 0
}

/** En el servidor no hay reseñas quietas montadas. */
function getServerSnapshot(): boolean {
  return false
}

/**
 * Indica si hay reseñas quietas debajo del pie (ver {@link registerFooterStage}). En el servidor
 * y en la hidratación es `false`; responde a los cambios (por ejemplo, al navegar a otra página).
 *
 * @returns `true` mientras haya reseñas quietas montadas.
 */
export function useFooterStage(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
