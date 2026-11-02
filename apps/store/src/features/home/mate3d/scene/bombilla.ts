import type * as Three from 'three'
import type { SceneModule, SceneShared, ThreeLib } from './types'
import { disposeTree } from './dispose'
import { place } from './place'

/** Dónde se calza la pala: en el hueco derecho, en coordenadas de `mate` (la altura sale del hueco). */
const SPOON_X = 0.16

/** Profundidad de la pala en el hueco, en coordenadas de `mate`. */
const SPOON_Z = 0.05

/**
 * Cuánto se hunde el origen de la bombilla (la pala) bajo la superficie del hueco: la pala entera
 * queda adentro de la yerba, que la tapa.
 */
const SPOON_DEPTH = 0.14

/** Lo más abajo que puede quedar la pala: apenas sobre el fondo curado del mate (0,56). */
const SPOON_FLOOR = 0.6

/** Cuánto más adentro que el radio de la yerba apoya el eje del caño: su grosor y el del aro. */
const REST_INSET = 0.025

/** Recorta un número entre 0 y 1. */
function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/** Interpola entre dos números. */
function lerp(from: number, to: number, share: number): number {
  return from + (to - from) * share
}

/**
 * Crea la bombilla de alpaca y bronce (pala, caño, anillos y pico), con el origen en la pala, y su
 * ancla de calce dentro del mate.
 *
 * El ancla está en el hueco derecho: la pala en el fondo del hueco (`x` 0,16, `z` 0,05, hundida bajo
 * `shared.yerba.hollowCenter`, que la yerba actualiza antes de este `update`) y el caño inclinado hacia
 * la derecha hasta apoyarse en la virola. `state.tilt` corre ese apoyo por la virola: son los grados
 * alrededor del eje del mate desde el lado derecho (negativo, hacia atrás; positivo, hacia la cámara).
 *
 * Su `update` la lleva de la colocación suelta (`state.bombilla`, arriba a la derecha) al ancla según
 * `state.attached`, sin fundido: primero se acerca de costado y al final baja casi vertical, así la
 * pala entra por la boca y se hunde en la yerba. Suelta, gira apenas sobre su eje (acotado y continuo,
 * sin acumular tiempo).
 *
 * @param T - La biblioteca `three` que cargó `scene.ts`.
 * @param parent - Donde va la bombilla (la escena); el ancla va en `shared.mate.mate`.
 * @param shared - Los materiales, el mate (`mouthY`, `interiorRadius`) y la yerba (`hollowCenter`).
 * @returns El módulo ({@link SceneModule}).
 */
export function createBombilla(
  T: ThreeLib,
  parent: Three.Object3D,
  shared: SceneShared,
): SceneModule {
  const { smoothAlpaca, bronze } = shared.materials
  const { mouthY, interiorRadius } = shared.mate
  const { hollowCenter } = shared.yerba
  const degrees = T.MathUtils.degToRad
  // Dónde se calza la bombilla: la pala en el hueco y el caño hacia la virola (se acomoda cada cuadro).
  const attach = new T.Object3D()
  shared.mate.mate.add(attach)

  // La bombilla, con el origen en la pala.
  const bombilla = new T.Group()
  parent.add(bombilla)
  const spoon = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 0.014, 32), smoothAlpaca)
  spoon.rotation.x = Math.PI / 2
  spoon.position.y = 0.06
  spoon.scale.set(1, 1, 1.6)
  bombilla.add(spoon)
  const tube = new T.Mesh(new T.CylinderGeometry(0.017, 0.017, 1.12, 20), smoothAlpaca)
  tube.position.y = 0.64
  bombilla.add(tube)
  for (const y of [0.52, 0.92, 1.16]) {
    const ring = new T.Mesh(new T.TorusGeometry(0.022, 0.008, 10, 32), bronze)
    ring.rotation.x = Math.PI / 2
    ring.position.y = y
    bombilla.add(ring)
  }
  const tipProfile = [
    [0, 1.42],
    [0.01, 1.41],
    [0.02, 1.36],
    [0.026, 1.27],
    [0.026, 1.2],
    [0.02, 1.18],
  ].map(([radius = 0, y = 0]) => new T.Vector2(radius, y))
  bombilla.add(new T.Mesh(new T.LatheGeometry(tipProfile, 32), bronze))

  const dummy = new T.Object3D()
  const from = new T.Vector3()
  const to = new T.Vector3()
  const fromRotation = new T.Quaternion()
  const toRotation = new T.Quaternion()
  const scratchScale = new T.Vector3()
  const attachScale = new T.Vector3()
  const rest = new T.Vector3()
  const up = new T.Vector3(0, 1, 0)

  return {
    update: (frame) => {
      const { state, t } = frame
      // La bombilla suelta, en su colocación.
      place(dummy, state.bombilla, frame)
      dummy.updateMatrixWorld(true)
      dummy.matrixWorld.decompose(from, fromRotation, scratchScale)

      // El ancla: la pala hundida en el hueco y el caño apoyado en la virola, donde diga `tilt`.
      attach.position.set(SPOON_X, Math.max(SPOON_FLOOR, hollowCenter.y - SPOON_DEPTH), SPOON_Z)
      const around = degrees(state.tilt)
      const restRadius = interiorRadius - REST_INSET
      rest.set(Math.cos(around) * restRadius, mouthY, Math.sin(around) * restRadius)
      attach.quaternion.setFromUnitVectors(up, rest.sub(attach.position).normalize())
      attach.updateMatrixWorld(true)
      attach.matrixWorld.decompose(to, toRotation, scratchScale)
      attach.getWorldScale(attachScale)

      // De suelta a calzada sin fundido: se acerca de costado y al final baja casi vertical.
      const attached = clamp01(state.attached)
      const across = 1 - (1 - attached) ** 2
      bombilla.position.set(
        lerp(from.x, to.x, across),
        lerp(from.y, to.y, attached),
        lerp(from.z, to.z, across),
      )
      bombilla.quaternion.slerpQuaternions(fromRotation, toRotation, attached)
      bombilla.scale.setScalar(lerp(dummy.scale.x, attachScale.x, attached))
      // Giro acotado y continuo: vale 0 en attached = 1 y nunca acumula el tiempo absoluto.
      bombilla.rotation.y += Math.sin(t * 0.4) * 0.6 * (1 - attached) ** 2
    },
    dispose: () => {
      disposeTree(bombilla)
      bombilla.removeFromParent()
      attach.removeFromParent()
    },
  }
}
