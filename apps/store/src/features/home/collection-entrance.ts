/**
 * La entrada de la colección desde la profundidad (Ruling MR-22): funciones puras que dan, para el
 * avance de la entrada (de 0 a 1), cómo se ven la capa de yerba, el título y cada tarjeta. Las usa
 * `CollectionEntrance`, pegadas al scroll.
 */

/**
 * Parte del recorrido de la colección (desde que su borde de arriba asoma abajo hasta que llega
 * arriba de todo) que dura la entrada: termina con la colección al 15 % de arriba de la ventana
 * (`offset: ['start end', 'start 15%']`).
 */
export const ENTRANCE_SHARE = 0.85

/**
 * Escala con que arranca la capa de yerba: la misma con que termina la del escenario del mate
 * (`MateStage`), así el cambio de una a otra no se nota.
 */
export const BRIDGE_START_SCALE = 1.15

/** Tramo de la entrada en que la capa de yerba se aleja (escala) y se desenfoca. */
const BRIDGE_SPAN = [0, 0.75] as const

/**
 * Tramo de la entrada en que la capa de yerba se disuelve: recién cuando el título y las tarjetas
 * ya ocupan buena parte de la pantalla, así nunca queda más de un tercio de fondo liso arriba de la
 * colección mientras sube.
 */
const BRIDGE_FADE_SPAN = [0.45, 1] as const

/** Tramo de la entrada en que el título sube con la máscara: ya viene subiendo cuando asoma. */
const TITLE_SPAN = [0, 0.25] as const

/**
 * Avance de la entrada en que empieza a salir la primera tarjeta: desde el principio, así la
 * primera hilera ya viene saliendo de la profundidad cuando asoma abajo (cerca de 0,22).
 */
const CARD_START = 0

/** Desfase entre una tarjeta y la siguiente, en avance de la entrada. */
export const CARD_STAGGER = 0.08

/**
 * Cuánto avance dura la salida de cada tarjeta: la séptima (seis líneas y "Ver todo el catálogo")
 * termina justo al final (0 + 6 · 0,08 + 0,52 = 1).
 */
const CARD_LENGTH = 0.52

/** Lo que la capa de yerba o una tarjeta muestran en un momento de la entrada. */
export interface DepthLook {
  /** `transform` de CSS (`none` en el lugar final). */
  transform: string
  /** `filter` de CSS (`none` sin desenfoque). */
  filter: string
  /** Opacidad, de 0 a 1. */
  opacity: number
}

/** Lo que el título muestra en un momento de la entrada. */
export interface TitleLook {
  /** `transform` de CSS de la línea que sube dentro de la máscara (`none` en su lugar). */
  transform: string
}

/** Redondea a tres decimales para que los estilos sean cortos y estables. */
function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

/** Lanza `RangeError` si el avance de la entrada no es un número de 0 a 1. */
function assertProgress(progress: number): void {
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
    throw new RangeError(
      `El avance de la entrada de la colección tiene que ser un número de 0 a 1; se recibió ${String(progress)}.`,
    )
  }
}

/**
 * Cuánto va de un tramo, con la curva senoidal (la de las animaciones pegadas al scroll: arranca y
 * termina sin velocidad). Antes del tramo da 0 y después, 1.
 *
 * @param progress - El avance, un número.
 * @param from - Dónde empieza el tramo.
 * @param to - Dónde termina; mayor que `from`.
 * @returns De 0 a 1.
 * @throws {RangeError} Si `progress` no es un número o el tramo no va de menor a mayor.
 * @example
 * sineShare(0.4, 0.2, 0.6) // 0.5
 */
export function sineShare(progress: number, from: number, to: number): number {
  if (Number.isNaN(progress)) {
    throw new RangeError('El avance tiene que ser un número.')
  }
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
    throw new RangeError(
      `El tramo tiene que ir de menor a mayor; se recibió de ${String(from)} a ${String(to)}.`,
    )
  }
  const linear = Math.min(1, Math.max(0, (progress - from) / (to - from)))
  if (linear === 0 || linear === 1) return linear
  return (1 - Math.cos(Math.PI * linear)) / 2
}

/**
 * La capa de yerba (el adentro del mate) en un momento de la entrada: arranca entera y nítida,
 * como el último cuadro del escenario, se aleja (escala 1,15 → 1) y se desenfoca (0 → 10 px) en
 * los primeros tres cuartos de la entrada, y se disuelve desde el 45 % hasta el final, detrás del
 * título y de las tarjetas que salen de la profundidad.
 *
 * @param progress - Avance de la entrada, de 0 a 1.
 * @returns El estilo de la capa.
 * @throws {RangeError} Si `progress` no es un número de 0 a 1.
 */
export function bridgeLook(progress: number): DepthLook {
  assertProgress(progress)
  const share = sineShare(progress, BRIDGE_SPAN[0], BRIDGE_SPAN[1])
  const fade = sineShare(progress, BRIDGE_FADE_SPAN[0], BRIDGE_FADE_SPAN[1])
  return {
    transform: `scale(${String(round(BRIDGE_START_SCALE - (BRIDGE_START_SCALE - 1) * share))})`,
    filter: share === 0 ? 'none' : `blur(${String(round(10 * share))}px)`,
    opacity: round(1 - fade),
  }
}

/**
 * El título en un momento de la entrada: su línea sube desde abajo de la máscara (110 % de su alto)
 * hasta su lugar en el primer cuarto de la entrada.
 *
 * @param progress - Avance de la entrada, de 0 a 1.
 * @returns El estilo de la línea del título.
 * @throws {RangeError} Si `progress` no es un número de 0 a 1.
 */
export function titleLook(progress: number): TitleLook {
  assertProgress(progress)
  const share = sineShare(progress, TITLE_SPAN[0], TITLE_SPAN[1])
  return { transform: share === 1 ? 'none' : `translateY(${String(round(110 * (1 - share)))}%)` }
}

/**
 * Una tarjeta en un momento de la entrada: sale de la profundidad
 * (`perspective(1200px) translateZ(-600px) rotateX(10deg) scale(0.7)`, 12 px de desenfoque y
 * transparente) hasta su lugar, una tras otra, desfasadas {@link CARD_STAGGER}. En su lugar no lleva
 * transformación ni filtro.
 *
 * @param progress - Avance de la entrada, de 0 a 1.
 * @param index - Posición de la tarjeta en la pista, desde 0.
 * @returns El estilo de la tarjeta.
 * @throws {RangeError} Si `progress` no es un número de 0 a 1 o `index` no es un entero desde 0.
 * @example
 * cardLook(1, 0) // { transform: 'none', filter: 'none', opacity: 1 }
 */
export function cardLook(progress: number, index: number): DepthLook {
  assertProgress(progress)
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError(
      `La posición de la tarjeta tiene que ser un entero desde 0; se recibió ${String(index)}.`,
    )
  }
  // Si hubiera más de siete, las que siguen salen con la séptima: todas terminan en su lugar.
  const from = Math.min(CARD_START + CARD_STAGGER * index, 1 - CARD_LENGTH)
  const share = sineShare(progress, from, from + CARD_LENGTH)
  if (share === 1) return { transform: 'none', filter: 'none', opacity: 1 }
  const rest = 1 - share
  return {
    transform: `perspective(1200px) translateZ(${String(round(-600 * rest))}px) rotateX(${String(round(10 * rest))}deg) scale(${String(round(0.7 + 0.3 * share))})`,
    filter: `blur(${String(round(12 * rest))}px)`,
    opacity: round(share),
  }
}
