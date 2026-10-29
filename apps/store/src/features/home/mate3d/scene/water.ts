import type * as Three from 'three'
import type { SceneModule, SceneShared, ThreeLib } from './types'
import { disposeTree } from './dispose'

/** Nubes de vapor. */
const STEAM_COUNT = 9

/** Recorta un número entre 0 y 1. */
function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/**
 * Crea el agua: el chorro (un cilindro fino que baja desde arriba del cuadro hasta junto a la
 * bombilla, con `state.water`) y las nubes de vapor que suben de la boca (`state.steam`).
 *
 * Punto de extensión (Task 2): el `update(frame)` acomoda el agua para `frame.state` (`water`,
 * `steam` y, cuando estén modelados, `thermos`, `splash` y `puddle`; hoy no se usan). El centro del
 * hueco está en `shared.yerba.hollowCenter` (coordenadas de `mate`; a mundo con
 * `frame.mate.localToWorld`) y la yerba lo actualiza antes de este `update`.
 *
 * @param T - La biblioteca `three` que cargó `scene.ts`.
 * @param parent - Donde van el chorro y el vapor (la escena).
 * @param shared - Los materiales (`steamMap`), el mate, el paquete y la yerba.
 * @returns El módulo ({@link SceneModule}).
 */
export function createWater(T: ThreeLib, parent: Three.Object3D, shared: SceneShared): SceneModule {
  const { steamMap } = shared.materials
  const water = new T.Mesh(
    new T.CylinderGeometry(0.018, 0.022, 1, 12, 1, true),
    new T.MeshPhysicalMaterial({
      color: '#e4f1f4',
      roughness: 0.05,
      transparent: true,
      opacity: 0.55,
      transmission: 0.2,
    }),
  )
  parent.add(water)
  const steams = Array.from({ length: STEAM_COUNT }, () => {
    const cloud = new T.Sprite(
      new T.SpriteMaterial({ map: steamMap, transparent: true, depthWrite: false, opacity: 0 }),
    )
    parent.add(cloud)
    return cloud
  })
  const to = new T.Vector3()

  return {
    update: ({ state, t, halfHeight, mateRoot }) => {
      // El chorro de agua, desde arriba del cuadro hasta junto a la bombilla. Ajuste de la Task 2: con
      // el 0,5 del diseño el chorro quedaba cortado en el aire sobre la montañita; con 0,3 termina
      // adentro de la yerba, que lo tapa (el chorro respeta la profundidad), y se ve entrar en ella.
      const waterShare = clamp01(state.water)
      water.visible = waterShare > 0.03
      if (water.visible) {
        mateRoot.localToWorld(to.set(-0.14, 0.3, 0.05))
        const top = halfHeight + 0.2
        const length = (top - to.y) * waterShare
        water.scale.set(mateRoot.scale.x, length, mateRoot.scale.x)
        water.position.set(to.x, top - length / 2, to.z)
      }

      // El vapor que sube de la boca.
      const steam = clamp01(state.steam)
      mateRoot.localToWorld(to.set(0, 0.5, 0))
      steams.forEach((cloud, index) => {
        const u = (t * 0.22 + index / STEAM_COUNT) % 1
        cloud.visible = steam > 0.01
        cloud.position.set(
          to.x + Math.sin(t + index * 2.1) * 0.12 * u,
          to.y + 0.1 + u * 1.1 * mateRoot.scale.x,
          to.z,
        )
        const size = (0.25 + u * 0.7) * mateRoot.scale.x
        cloud.scale.set(size, size, 1)
        // Ajuste de la Task 2: con el 0,5 del diseño el vapor casi no se veía sobre los fondos oscuros.
        cloud.material.opacity = steam * Math.sin(u * Math.PI) * 0.75
      })
    },
    dispose: () => {
      for (const object of [water, ...steams]) {
        disposeTree(object)
        object.removeFromParent()
      }
    },
  }
}
