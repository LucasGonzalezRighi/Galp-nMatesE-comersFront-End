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

/** Franjas verticales de la palabra GALPÓN en escritorio. */
export const WORD_STRIPS_WIDE = 20

/** Franjas verticales de la palabra GALPÓN en el celular (menos, para dibujar menos capas). */
export const WORD_STRIPS_NARROW = 12

/**
 * Cuánto se desfasa la última franja respecto de la primera, como parte del recorrido de la
 * palabra: la primera sube de 0 a 0,5 y la última de 0,5 a 1, así el borde de arriba de la palabra
 * es una ola que la recorre de izquierda a derecha y al final queda entera.
 */
export const WORD_WAVE_SPREAD = 0.5

/** Cuánto baja una franja antes de subir, en porcentaje de su propio alto. */
export const WORD_STRIP_DROP = 70

/** Cuánto se solapan dos franjas vecinas (cada una sobra medio píxel de su lado) para que no haya juntas. */
const WORD_STRIP_OVERLAP = '0.5px'

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

/** Exige un avance de 0 a 1; `what` dice de qué es, para el mensaje. */
function assertCover(cover: number, what = 'Cuánto subió el pie'): void {
  if (!Number.isFinite(cover) || cover < 0 || cover > 1) {
    throw new RangeError(`${what} tiene que ser un número de 0 a 1; se recibió ${String(cover)}.`)
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
 * Cuánto avanzó la entrada de la palabra GALPÓN, que llega última: de la mitad de la subida al
 * final, lineal. Alimenta a las franjas ({@link wordStripShare}), cada una con su propia curva.
 *
 * @param cover - Cuánto subió el pie, de 0 a 1.
 * @returns El avance de la palabra, de 0 (no empezó) a 1 (entera).
 * @throws {RangeError} Si `cover` no es un número de 0 a 1.
 * @example
 * footerWordProgress(0.75) // 0.5
 */
export function footerWordProgress(cover: number): number {
  assertCover(cover)
  return Math.min(1, Math.max(0, (cover - WORD_FROM) / (1 - WORD_FROM)))
}

/** Exige un índice de franja válido para `count` franjas. */
function assertStrip(index: number, count: number): void {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError(
      `La cantidad de franjas tiene que ser un entero de 1 o más; se recibió ${String(count)}.`,
    )
  }
  if (!Number.isInteger(index) || index < 0 || index >= count) {
    throw new RangeError(
      `La franja tiene que ser un entero de 0 a ${String(count - 1)}; se recibió ${String(index)}.`,
    )
  }
}

/**
 * Cuánto subió una franja de la palabra GALPÓN: cada una tiene su tramo del avance, con la curva
 * senoidal y desfasado según su lugar (la primera sale sin atraso, la última con un atraso de
 * {@link WORD_WAVE_SPREAD} y las del medio en proporción), así el borde de arriba de la palabra
 * forma una ola que la recorre de izquierda a derecha. Con el avance en 1 todas están enteras.
 *
 * @param progress - Avance de la palabra, de 0 a 1 (ver {@link footerWordProgress}).
 * @param index - La franja, desde 0 (la de la izquierda).
 * @param count - Cuántas franjas tiene la palabra, un entero de 1 o más.
 * @returns Cuánto subió, de 0 (abajo, apagada) a 1 (en su lugar e iluminada).
 * @throws {RangeError} Si `progress` no es un número de 0 a 1 o `index` o `count` no son válidos.
 * @example
 * wordStripShare(0.5, 0, 20) // 1
 */
export function wordStripShare(progress: number, index: number, count: number): number {
  assertCover(progress, 'El avance de la palabra')
  assertStrip(index, count)
  const delay = count === 1 ? 0 : (WORD_WAVE_SPREAD * index) / (count - 1)
  return easeInOutSine((progress - delay) / (1 - WORD_WAVE_SPREAD))
}

/** Un borde de franja en porcentaje, redondeado a milésimas, con su medio píxel de solape. */
function stripEdge(percent: number): string {
  const rounded = Math.round(percent * 1000) / 1000
  return rounded === 0 ? '0' : `calc(${String(rounded)}% - ${WORD_STRIP_OVERLAP})`
}

/**
 * El recorte (`clip-path`) de una franja vertical de la palabra: `inset(0 derecha 0 izquierda)`
 * con los porcentajes redondeados a milésimas y medio píxel de solape con cada vecina (los bordes
 * de la palabra no se solapan con nada). Todas las franjas dibujan la misma máscara y cada una
 * muestra solo su tajada.
 *
 * @param index - La franja, desde 0 (la de la izquierda).
 * @param count - Cuántas franjas tiene la palabra, un entero de 1 o más.
 * @returns El valor de `clip-path`.
 * @throws {RangeError} Si `index` o `count` no son válidos.
 * @example
 * wordStripClip(1, 4) // "inset(0 calc(50% - 0.5px) 0 calc(25% - 0.5px))"
 */
export function wordStripClip(index: number, count: number): string {
  assertStrip(index, count)
  const left = (index / count) * 100
  const right = ((count - 1 - index) / count) * 100
  return `inset(0 ${stripEdge(right)} 0 ${stripEdge(left)})`
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
