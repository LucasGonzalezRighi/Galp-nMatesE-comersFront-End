import { HOLD_SHARE } from '../stage-layout'

/** Cantidad de paradas del recorrido del mate: el mate, la bombilla y el agua. */
export const MATE_STOP_COUNT = 3

/**
 * Dónde está y cómo gira una pieza: `[x, y, escala, giroX, giroY, giroZ]`. `x` e `y` van en
 * fracciones de media pantalla desde el centro (1 es el borde derecho o el de arriba; más allá queda
 * fuera de cuadro), la escala es 1 para el tamaño del diseño y los giros van en grados. El giro Z
 * positivo inclina la pieza hacia la izquierda de la pantalla (la boca del mate, la punta del
 * paquete).
 */
export type MatePlacement = readonly [
  x: number,
  y: number,
  scale: number,
  rotateX: number,
  rotateY: number,
  rotateZ: number,
]

/** Lo que la escena 3D muestra en un momento del recorrido; ver el README de `mate3d`. */
export interface MateState {
  /** El mate; su giro Z lo inclina (55 lo deja volcado a la izquierda para recibir la yerba). */
  readonly mate: MatePlacement
  /** La bombilla suelta (mientras `attached` es 0): de dónde entra o adónde se va. */
  readonly bombilla: MatePlacement
  /** Cuánto está calzada la bombilla en la yerba, de 0 (suelta) a 1 (calzada). */
  readonly attached: number
  /** El paquete de yerba; con el giro Z cerca de −150 queda cabeza abajo, con el pico hacia el mate. */
  readonly pack: MatePlacement
  /**
   * El pico del termo (la boca por donde sale el agua); el giro Z positivo lo inclina hacia la
   * izquierda para servir.
   */
  readonly thermos: MatePlacement
  /** Volumen de yerba dentro del mate, de 0 (vacío) a 1 (lleno hasta la virola). */
  readonly fill: number
  /**
   * Pendiente de la superficie de la yerba, de 0 (plana) a 1 (asentada contra la pared izquierda del
   * mate, la pendiente que deja el mate inclinado).
   */
  readonly slope: number
  /**
   * Pared de la montañita, de 0 (la pendiente natural) a 1 (la cara derecha cae recta, como después
   * de sacudir el mate tapado).
   */
  readonly wall: number
  /** Yerba húmeda en el hueco junto a la bombilla, de 0 a 1. */
  readonly wet: number
  /** Chorro de agua del termo que cae en el hueco, de 0 a 1. */
  readonly water: number
  /** Vapor que sube del mate, de 0 a 1. */
  readonly steam: number
  /** Agua juntada en el hueco (el charco), de 0 a 1. */
  readonly puddle: number
  /** Salpicadura del chorro al caer en el hueco, de 0 a 1. */
  readonly splash: number
  /** Yerba que cae del pico del paquete hacia el mate, de 0 a 1. */
  readonly pour: number
  /**
   * Cuánto se corre por la virola el apoyo del caño de la bombilla calzada, en grados alrededor del
   * eje del mate desde el lado derecho (negativo hacia atrás, positivo hacia la cámara).
   */
  readonly tilt: number
}

/** Nombre de cada momento del recorrido. */
export type MateMoment =
  'agua' | 'agua-fin' | 'bombilla' | 'inclinado' | 'inicio' | 'lleno' | 'salida'

/** Un momento del recorrido y el tramo del avance en que la escena se queda en él. */
export interface MateKeyframe {
  /** Nombre del momento. */
  readonly name: MateMoment
  /** Avance (0 a 1) en que la escena llega a este estado. */
  readonly from: number
  /** Avance hasta el que se queda en este estado; igual a `from` si sigue de largo. */
  readonly to: number
  /** El estado. */
  readonly state: MateState
}

/** Tramo del avance de cada parada. */
const SPAN = 1 / MATE_STOP_COUNT

/** Largo del hold de cada parada: el 55 % del tramo, como en `stageLayout`. */
const HOLD = SPAN * HOLD_SHARE

/** La bombilla suelta, fuera de cuadro arriba a la derecha del mate: entra desde ahí. */
const BOMBILLA_OUT: MatePlacement = [0.75, 1.9, 1, 0, 0, -20]

/** El paquete fuera de cuadro, arriba a la izquierda del mate: entra y se va por ahí. */
const PACK_OUT: MatePlacement = [0, 1.8, 0.85, 0, -20, -20]

/**
 * El pico del termo fuera de cuadro, arriba a la derecha. La escala es la misma (1,2) en todos los
 * momentos, para que el termo no cambie de tamaño al entrar.
 */
const THERMOS_OUT: MatePlacement = [1.1, 1.7, 1.2, 0, 0, 60]

/** El mate de la portada (parada 1): de pie a la derecha, de frente y apenas mirado desde arriba. */
const MATE_COVER: MatePlacement = [0.42, -0.1, 1, 10, -25, 0]

/**
 * El mate en las paradas 2 y 3, quieto: en el mismo lugar y con el mismo giro que la portada (Lucas,
 * 2026-10-29: "que vuelva a la posición inicial del mate"), apenas más arriba la mirada (giro X 16)
 * y un 5 % más grande, para que la montañita se lea asomando sobre la virola. El hueco queda bajo el
 * borde derecho: se ven la bombilla apoyada en la virola, el chorro que entra y el vapor que sale.
 */
const MATE_FRONT: MatePlacement = [0.42, -0.1, 1.05, 16, -25, 0]

/**
 * Los momentos del recorrido, en orden. En el hold de la parada 1 el mate se inclina 55° a la
 * izquierda, el paquete entra por arriba a la izquierda, vuelca sobre la boca y la yerba se junta
 * contra la pared baja; el paquete se va por donde vino y, entre la 1 y la 2, el mate se endereza con
 * la yerba contra la pared izquierda y la cara derecha cayendo recta, y la bombilla entra desde arriba
 * a la derecha y se calza en el hueco. Entre la 2 y la 3 entra el pico del termo por arriba a la
 * derecha; en el primer cuarto del hold 3 el chorro cae en el hueco y salpica, y al terminar el hold
 * cortó: quedan el charco, la yerba húmeda y el vapor. En las paradas 2 y 3 el mate está de
 * frente, como en la portada (la montañita asoma sobre la virola y el hueco queda bajo el borde
 * derecho). Al final va al medio, sube y crece hacia la cámara con la boca hacia quien mira,
 * apenas volcado hacia la bombilla, como si te lo estuvieran dando.
 */
export const MATE_KEYFRAMES: readonly [MateKeyframe, ...MateKeyframe[]] = [
  {
    name: 'inicio',
    from: 0,
    to: 0,
    state: {
      mate: MATE_COVER,
      bombilla: BOMBILLA_OUT,
      attached: 0,
      pack: PACK_OUT,
      thermos: THERMOS_OUT,
      fill: 0,
      slope: 0,
      wall: 0,
      wet: 0,
      water: 0,
      steam: 0,
      puddle: 0,
      splash: 0,
      pour: 0,
      tilt: 0,
    },
  },
  {
    name: 'inclinado',
    from: HOLD * 0.35,
    to: HOLD * 0.35,
    state: {
      mate: [0.46, -0.3, 0.94, 10, 15, 55],
      bombilla: BOMBILLA_OUT,
      attached: 0,
      // El pico queda sobre la boca inclinada y la yerba cae casi vertical (medido con three a 16:9).
      pack: [0.3, 0.36, 0.85, 0, -20, -150],
      thermos: THERMOS_OUT,
      fill: 0.45,
      slope: 1,
      wall: 0,
      wet: 0,
      water: 0,
      steam: 0,
      puddle: 0,
      splash: 0,
      pour: 1,
      tilt: 0,
    },
  },
  {
    name: 'lleno',
    from: HOLD * 0.85,
    to: HOLD * 0.85,
    state: {
      mate: [0.45, -0.26, 0.98, 12, 25, 40],
      bombilla: BOMBILLA_OUT,
      attached: 0,
      pack: [0.06, 0.9, 0.85, 0, -20, -80],
      thermos: THERMOS_OUT,
      fill: 1,
      slope: 1,
      wall: 0.35,
      wet: 0,
      water: 0,
      steam: 0,
      puddle: 0,
      splash: 0,
      pour: 0,
      tilt: 0,
    },
  },
  {
    name: 'bombilla',
    from: SPAN,
    to: SPAN + HOLD,
    state: {
      mate: MATE_FRONT,
      bombilla: BOMBILLA_OUT,
      attached: 1,
      pack: PACK_OUT,
      thermos: THERMOS_OUT,
      fill: 1,
      slope: 1,
      wall: 1,
      wet: 0,
      water: 0,
      steam: 0,
      puddle: 0,
      splash: 0,
      pour: 0,
      tilt: -16,
    },
  },
  {
    name: 'agua',
    from: 2 * SPAN + HOLD * 0.25,
    to: 2 * SPAN + HOLD * 0.25,
    state: {
      mate: MATE_FRONT,
      bombilla: BOMBILLA_OUT,
      attached: 1,
      pack: PACK_OUT,
      // La boca del pico mira abajo a la izquierda, unos 55° bajo la horizontal; el cuerpo queda fuera.
      thermos: [0.55, 0.62, 1.2, 0, 0, 145],
      fill: 1,
      slope: 1,
      wall: 1,
      wet: 0.7,
      water: 1,
      steam: 0.6,
      puddle: 0.5,
      splash: 1,
      pour: 0,
      tilt: -10,
    },
  },
  {
    name: 'agua-fin',
    from: 2 * SPAN + HOLD,
    to: 2 * SPAN + HOLD,
    state: {
      mate: MATE_FRONT,
      bombilla: BOMBILLA_OUT,
      attached: 1,
      pack: PACK_OUT,
      thermos: [0.66, 1.05, 1.2, 0, 0, 100],
      fill: 1,
      slope: 1,
      wall: 1,
      wet: 1,
      water: 0,
      steam: 1,
      puddle: 1,
      splash: 0,
      pour: 0,
      tilt: -10,
    },
  },
  {
    name: 'salida',
    from: 1,
    to: 1,
    state: {
      // Va al medio, sube y crece hacia la cámara, como si te lo dieran (Lucas: "para arriba y al
      // medio"): el centro sube de −0,1 a 0,1 y la boca se vuelca hacia quien mira (giro X 28: se ve
      // la montañita entera), apenas volcado a la derecha, hacia la bombilla (giro Z −14). Con la
      // boca hacia la cámara y ese vuelco la bombilla queda más acostada y, con la escala 1,25 (antes
      // 1,45), su punta pasa unos 20 px debajo del encabezado (medido a 1440 × 900 y 1905 × 950 en
      // 0,97, cuando todavía se ve). El texto de la parada 3 y el fundido del escenario se apagan en
      // el mismo tramo final (`MateStage`): el mate pasa por el medio sin pisar letras.
      mate: [0, 0.1, 1.25, 28, -10, -14],
      bombilla: BOMBILLA_OUT,
      attached: 1,
      pack: PACK_OUT,
      thermos: THERMOS_OUT,
      fill: 1,
      slope: 1,
      wall: 1,
      wet: 1,
      water: 0,
      steam: 0.5,
      puddle: 1,
      splash: 0,
      pour: 0,
      tilt: -10,
    },
  },
]

/** Interpola entre dos números; exacta en los extremos (0 da `from` y 1 da `to`, sin redondeo). */
function lerp(from: number, to: number, share: number): number {
  return from * (1 - share) + to * share
}

/** Interpola entre dos colocaciones, campo por campo. */
function lerpPlacement(from: MatePlacement, to: MatePlacement, share: number): MatePlacement {
  return [
    lerp(from[0], to[0], share),
    lerp(from[1], to[1], share),
    lerp(from[2], to[2], share),
    lerp(from[3], to[3], share),
    lerp(from[4], to[4], share),
    lerp(from[5], to[5], share),
  ]
}

/**
 * Interpola entre dos estados, campo por campo, en línea recta: la escena lo usa también para
 * acercarse cuadro a cuadro al estado objetivo.
 *
 * @param from - El estado de partida.
 * @param to - El estado de llegada.
 * @param share - Cuánto del camino recorrer, de 0 (`from`) a 1 (`to`).
 * @returns Un estado nuevo; no modifica los recibidos.
 * @throws {RangeError} Si `share` no es un número de 0 a 1.
 * @example
 * lerpMateState(vacio, lleno, 0.5).fill // 0.5
 */
export function lerpMateState(from: MateState, to: MateState, share: number): MateState {
  if (!Number.isFinite(share) || share < 0 || share > 1) {
    throw new RangeError(
      `La parte del camino entre dos estados del mate tiene que ser un número de 0 a 1; se recibió ${String(share)}.`,
    )
  }
  return {
    mate: lerpPlacement(from.mate, to.mate, share),
    bombilla: lerpPlacement(from.bombilla, to.bombilla, share),
    attached: lerp(from.attached, to.attached, share),
    pack: lerpPlacement(from.pack, to.pack, share),
    thermos: lerpPlacement(from.thermos, to.thermos, share),
    fill: lerp(from.fill, to.fill, share),
    slope: lerp(from.slope, to.slope, share),
    wall: lerp(from.wall, to.wall, share),
    wet: lerp(from.wet, to.wet, share),
    water: lerp(from.water, to.water, share),
    steam: lerp(from.steam, to.steam, share),
    puddle: lerp(from.puddle, to.puddle, share),
    splash: lerp(from.splash, to.splash, share),
    pour: lerp(from.pour, to.pour, share),
    tilt: lerp(from.tilt, to.tilt, share),
  }
}

/**
 * La curva del diseño para un tramo: quieta el primer y el último 8 % y quíntica (arranca y termina
 * sin velocidad) en el medio.
 */
function easeSegment(share: number): number {
  const x = Math.min(1, Math.max(0, (share - 0.08) / 0.84))
  return x * x * x * (x * (x * 6 - 15) + 10)
}

/**
 * El estado de la escena 3D para un avance del recorrido: busca entre qué momentos de
 * {@link MATE_KEYFRAMES} cae y los interpola con la curva quíntica del diseño; dentro del tramo de un
 * momento devuelve ese estado tal cual. Es pura: el mismo avance da siempre el mismo estado, así que
 * al volver atrás con el scroll todo se desarma igual.
 *
 * @param progress - Avance del recorrido de las tres paradas y la salida, de 0 a 1 (el `progress`
 *   del `ScrollStage`).
 * @returns El estado objetivo de la escena.
 * @throws {RangeError} Si `progress` no es un número de 0 a 1.
 * @example
 * mateStateAt(1 / 3).attached // 1: la parada 2 llega con la bombilla calzada
 */
export function mateStateAt(progress: number): MateState {
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
    throw new RangeError(
      `El avance del mate tiene que ser un número de 0 a 1; se recibió ${String(progress)}.`,
    )
  }
  let previous = MATE_KEYFRAMES[0]
  for (const keyframe of MATE_KEYFRAMES) {
    if (progress <= keyframe.to) {
      if (progress >= keyframe.from) return keyframe.state
      const share = (progress - previous.to) / (keyframe.from - previous.to)
      return lerpMateState(previous.state, keyframe.state, easeSegment(share))
    }
    previous = keyframe
  }
  return previous.state
}
