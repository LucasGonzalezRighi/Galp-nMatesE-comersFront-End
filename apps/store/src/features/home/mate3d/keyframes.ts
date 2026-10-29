import { HOLD_SHARE } from '../stage-layout'

/** Cantidad de paradas del recorrido del mate: el mate, la bombilla y el agua. */
export const MATE_STOP_COUNT = 3

/**
 * Dónde está y cómo gira una pieza: `[x, y, escala, giroX, giroY, giroZ]`. `x` e `y` van en
 * fracciones de media pantalla desde el centro (1 es el borde derecho o el de arriba; más allá queda
 * fuera de cuadro), la escala es 1 para el tamaño del diseño y los giros van en grados.
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
  /** El mate. */
  readonly mate: MatePlacement
  /** La bombilla suelta (mientras `attached` es 0): de dónde entra o adónde se va. */
  readonly bombilla: MatePlacement
  /** Cuánto está calzada la bombilla en la yerba, de 0 (suelta) a 1 (calzada). */
  readonly attached: number
  /** El paquete de yerba. */
  readonly pack: MatePlacement
  /** Altura de la yerba dentro del mate, de 0 (vacío) a 1 (lleno hasta la virola). */
  readonly fill: number
  /** Alto de la montañita de yerba, de 0 (plana) a 1. */
  readonly mound: number
  /** Mancha de yerba húmeda junto a la bombilla, de 0 a 1. */
  readonly wet: number
  /** Chorro de agua que cae junto a la bombilla, de 0 a 1. */
  readonly water: number
  /** Vapor que sube del mate, de 0 a 1. */
  readonly steam: number
  /** Yerba que cae del pico del paquete hacia el mate, de 0 a 1. */
  readonly pour: number
  /** Inclinación de la bombilla calzada, en grados (0 es la del diseño, apoyada en la montañita). */
  readonly tilt: number
}

/** Nombre de cada momento del recorrido. */
export type MateMoment = 'agua' | 'bombilla' | 'inicio' | 'lleno' | 'salida' | 'vuelco'

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

/** La bombilla suelta, fuera de cuadro arriba del mate: entra desde ahí. */
const BOMBILLA_ABOVE: MatePlacement = [0.4, 1.9, 1, 0, 0, -10]

/** El paquete fuera de cuadro, arriba a la derecha. */
const PACK_OUT: MatePlacement = [1.9, 0.9, 0.85, 0, -20, -40]

/**
 * Los momentos del recorrido, en orden. La parada 1 empieza con el mate vacío de la portada y en
 * su hold el paquete entra, vuelca y la yerba cae hasta formar la montañita; entre la 1 y la 2 el
 * mate gira hacia la cámara y la bombilla entra desde arriba y se calza; entre la 2 y la 3 cae el
 * chorro de agua, la yerba se humedece y sube el vapor; en el último 45 % de la parada 3 el mate se
 * aleja. Cada parada llega completa al principio de su tramo (adonde lleva el raíl) y se queda
 * quieta durante su hold.
 */
export const MATE_KEYFRAMES: readonly [MateKeyframe, ...MateKeyframe[]] = [
  {
    name: 'inicio',
    from: 0,
    to: 0,
    state: {
      mate: [0.42, -0.1, 1, 10, -25, 0],
      bombilla: BOMBILLA_ABOVE,
      attached: 0,
      pack: [0.22, 1.6, 0.85, 0, -20, 10],
      fill: 0,
      mound: 0,
      wet: 0,
      water: 0,
      steam: 0,
      pour: 0,
      tilt: 0,
    },
  },
  {
    name: 'vuelco',
    from: HOLD / 2,
    to: HOLD / 2,
    state: {
      mate: [0.44, -0.3, 0.94, 14, 15, 0],
      bombilla: BOMBILLA_ABOVE,
      attached: 0,
      pack: [0.25, 0.38, 0.85, 0, -20, -118],
      fill: 0.5,
      mound: 0.3,
      wet: 0,
      water: 0,
      steam: 0,
      pour: 1,
      tilt: 0,
    },
  },
  {
    name: 'lleno',
    from: HOLD,
    to: HOLD,
    state: {
      mate: [0.44, -0.24, 0.98, 12, 40, 0],
      bombilla: BOMBILLA_ABOVE,
      attached: 0,
      pack: [0.24, 0.52, 0.85, 0, -20, -80],
      fill: 1,
      mound: 1,
      wet: 0,
      water: 0,
      steam: 0,
      pour: 0,
      tilt: 0,
    },
  },
  {
    name: 'bombilla',
    from: SPAN,
    to: SPAN + HOLD,
    state: {
      mate: [0.36, -0.14, 1.2, 18, 200, 0],
      bombilla: BOMBILLA_ABOVE,
      attached: 1,
      pack: PACK_OUT,
      fill: 1,
      mound: 1,
      wet: 0,
      water: 0,
      steam: 0,
      pour: 0,
      tilt: -16,
    },
  },
  {
    name: 'agua',
    from: 2 * SPAN,
    to: 2 * SPAN + HOLD,
    state: {
      mate: [0.4, -0.2, 1.1, 12, 300, 0],
      bombilla: BOMBILLA_ABOVE,
      attached: 1,
      pack: PACK_OUT,
      fill: 1,
      mound: 1,
      wet: 1,
      water: 1,
      steam: 1,
      pour: 0,
      tilt: -10,
    },
  },
  {
    name: 'salida',
    from: 1,
    to: 1,
    state: {
      mate: [0.9, -0.9, 0.6, 8, 380, 0],
      bombilla: BOMBILLA_ABOVE,
      attached: 1,
      pack: PACK_OUT,
      fill: 1,
      mound: 1,
      wet: 1,
      water: 0,
      steam: 0.5,
      pour: 0,
      tilt: -10,
    },
  },
]

/** Interpola entre dos números. */
function lerp(from: number, to: number, share: number): number {
  return from + (to - from) * share
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
    fill: lerp(from.fill, to.fill, share),
    mound: lerp(from.mound, to.mound, share),
    wet: lerp(from.wet, to.wet, share),
    water: lerp(from.water, to.water, share),
    steam: lerp(from.steam, to.steam, share),
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
