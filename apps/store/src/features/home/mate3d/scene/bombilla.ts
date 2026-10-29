import type * as Three from 'three'
import type { SceneModule, SceneShared, ThreeLib } from './types'
import { disposeTree } from './dispose'
import { place } from './place'

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
 * ancla de calce dentro del mate. Su `update` la lleva de la colocación suelta (`state.bombilla`) al
 * ancla según `state.attached` (a mitad de camino se desvanece y reaparece calzada), con la
 * inclinación `state.tilt`.
 *
 * Punto de extensión (Task 2): el ancla puede salir de `shared.yerba.hollowCenter` (el hueco) en
 * lugar de la posición fija de hoy.
 *
 * @param T - La biblioteca `three` que cargó `scene.ts`.
 * @param parent - Donde va la bombilla (la escena); el ancla va en `shared.mate.mate`.
 * @param shared - Los materiales, el mate, el paquete y la yerba.
 * @returns El módulo ({@link SceneModule}).
 */
export function createBombilla(
  T: ThreeLib,
  parent: Three.Object3D,
  shared: SceneShared,
): SceneModule {
  const { smoothAlpaca, bronze } = shared.materials
  const degrees = T.MathUtils.degToRad
  // Dónde se calza la bombilla: contra la montañita, apenas inclinada.
  const attach = new T.Object3D()
  attach.position.set(-0.16, 0.5, 0.06)
  attach.rotation.z = degrees(13)
  shared.mate.mate.add(attach)

  // La bombilla, con el origen en la pala.
  const bombilla = new T.Group()
  parent.add(bombilla)
  const bombillaSilver = smoothAlpaca.clone()
  const bombillaGold = bronze.clone()
  bombillaSilver.transparent = true
  bombillaGold.transparent = true
  const spoon = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 0.014, 32), bombillaSilver)
  spoon.rotation.x = Math.PI / 2
  spoon.position.y = 0.06
  spoon.scale.set(1, 1, 1.6)
  bombilla.add(spoon)
  const tube = new T.Mesh(new T.CylinderGeometry(0.017, 0.017, 1.12, 20), bombillaSilver)
  tube.position.y = 0.64
  bombilla.add(tube)
  for (const y of [0.52, 0.92, 1.16]) {
    const ring = new T.Mesh(new T.TorusGeometry(0.022, 0.008, 10, 32), bombillaGold)
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
  bombilla.add(new T.Mesh(new T.LatheGeometry(tipProfile, 32), bombillaGold))

  const dummy = new T.Object3D()
  const from = new T.Vector3()
  const to = new T.Vector3()
  const fromRotation = new T.Quaternion()
  const toRotation = new T.Quaternion()
  const scratchScale = new T.Vector3()
  const attachScale = new T.Vector3()

  return {
    update: (frame) => {
      const { state, t } = frame
      // La bombilla: suelta en su lugar o calzada en la yerba; a mitad de camino se desvanece.
      place(dummy, state.bombilla, frame)
      dummy.updateMatrixWorld(true)
      dummy.matrixWorld.decompose(from, fromRotation, scratchScale)
      attach.rotation.set(
        degrees(state.tilt),
        degrees(-state.tilt * 0.4),
        degrees(13 * (1 - state.tilt / 60)),
      )
      attach.updateMatrixWorld(true)
      attach.matrixWorld.decompose(to, toRotation, scratchScale)
      attach.getWorldScale(attachScale)
      const attached = clamp01(state.attached)
      bombilla.position.lerpVectors(from, to, attached)
      bombilla.quaternion.slerpQuaternions(fromRotation, toRotation, attached)
      bombilla.scale.setScalar(lerp(dummy.scale.x, attachScale.x, attached))
      // Giro acotado y continuo: vale 0 en attached = 1 y nunca acumula el tiempo absoluto.
      bombilla.rotation.y += Math.sin(t * 0.4) * 0.6 * (1 - attached) ** 2
      const bombillaOpacity = Math.pow(Math.abs(2 * attached - 1), 0.8)
      bombillaSilver.opacity = bombillaOpacity
      bombillaGold.opacity = bombillaOpacity
      bombilla.visible = bombillaOpacity > 0.02
      bombillaSilver.depthWrite = bombillaOpacity > 0.95
      bombillaGold.depthWrite = bombillaOpacity > 0.95
    },
    dispose: () => {
      disposeTree(bombilla)
      bombilla.removeFromParent()
      attach.removeFromParent()
    },
  }
}
