import type * as Three from 'three'
import type { SceneShared, ThreeLib, YerbaModule } from './types'
import { disposeTree } from './dispose'

/** Partículas de yerba que caen del paquete. */
const PARTICLE_COUNT = 80

/** Recorta un número entre 0 y 1. */
function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/** Interpola entre dos números. */
function lerp(from: number, to: number, share: number): number {
  return from + (to - from) * share
}

/**
 * Crea la yerba: adentro del mate, un disco que sube con `fill`, la montañita (media esfera) y la
 * mancha húmeda; afuera, las partículas que caen del pico del paquete mientras `pour > 0,05`. Todo
 * con el material `yerba` (la foto real `yerba-albedo.jpg`).
 *
 * Punto de extensión (Task 1): el `update(frame)` acomoda la yerba para `frame.state` (`fill`,
 * `slope`, `wall`, `wet`, `pour`) y deja en `hollowCenter` el centro del hueco en coordenadas de
 * `mate` (hoy, el punto de la mancha húmeda), que leen la bombilla y el agua después. Mientras la
 * yerba siga siendo disco y media esfera, la montañita de antes sale de `slope` y `wall`:
 * `slope · min(1, 0,3 + 2·wall)` da el 0,3 del vuelco (pared 0) y 1 desde `wall 0,35` (lleno).
 *
 * @param T - La biblioteca `three` que cargó `scene.ts`.
 * @param parent - Donde van las partículas que caen (la escena); la yerba de adentro va en
 *   `shared.mate.mate`.
 * @param shared - Los materiales, el mate y el paquete (`spout`).
 * @returns El módulo, con `hollowCenter` ({@link YerbaModule}).
 */
export function createYerba(
  T: ThreeLib,
  parent: Three.Object3D,
  shared: Pick<SceneShared, 'materials' | 'mate' | 'pack'>,
): YerbaModule {
  const { yerba } = shared.materials
  const { mate } = shared.mate
  const { spout } = shared.pack
  const yerbaDisc = new T.Mesh(new T.CircleGeometry(shared.mate.interiorRadius, 64), yerba)
  yerbaDisc.rotation.x = -Math.PI / 2
  mate.add(yerbaDisc)
  const mound = new T.Mesh(
    new T.SphereGeometry(0.34, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    yerba,
  )
  mate.add(mound)
  const wetMaterial = new T.MeshStandardMaterial({
    color: '#2e3a10',
    roughness: 0.2,
    transparent: true,
    opacity: 0,
  })
  const wet = new T.Mesh(new T.CircleGeometry(0.13, 40), wetMaterial)
  wet.rotation.x = -Math.PI / 2
  mate.add(wet)
  const particles = new T.InstancedMesh(
    new T.BoxGeometry(0.022, 0.007, 0.016),
    yerba,
    PARTICLE_COUNT,
  )
  parent.add(particles)

  const hollowCenter = new T.Vector3(-0.15, 0.6, 0.06)
  const dummy = new T.Object3D()
  const from = new T.Vector3()
  const to = new T.Vector3()

  return {
    hollowCenter,
    update: ({ state, t, mateRoot }) => {
      // La yerba: el disco sube con el llenado, la montañita crece y la mancha húmeda aparece.
      const moundHeight = clamp01(state.slope) * Math.min(1, 0.3 + 2 * clamp01(state.wall))
      const fill = clamp01(state.fill)
      yerbaDisc.visible = fill > 0.01
      yerbaDisc.position.y = lerp(0.6, 0.985, fill)
      mound.visible = moundHeight > 0.02
      mound.position.set(0.07, yerbaDisc.position.y - 0.005, -0.02)
      mound.scale.set(0.95, Math.max(0.001, moundHeight * 0.42), 0.95)
      wetMaterial.opacity = clamp01(state.wet) * 0.85
      hollowCenter.set(-0.15, yerbaDisc.position.y + 0.004 + moundHeight * 0.02, 0.06)
      wet.position.copy(hollowCenter)
      wet.visible = state.wet > 0.02

      // La yerba que cae del pico del paquete a la boca del mate mientras vuelca.
      const pour = clamp01(state.pour)
      particles.visible = pour > 0.05
      if (particles.visible) {
        spout.getWorldPosition(from)
        mateRoot.localToWorld(to.set(0, 0.45, 0))
        for (let index = 0; index < PARTICLE_COUNT; index++) {
          const u = (t * 0.7 + index / PARTICLE_COUNT) % 1
          dummy.position.set(
            lerp(from.x, to.x, u) + Math.sin(index * 12.9) * 0.05,
            lerp(from.y, to.y, u * u),
            Math.cos(index * 7.3) * 0.05,
          )
          dummy.rotation.set(index, t * 3 + index, index * 0.5)
          dummy.scale.setScalar(pour * mateRoot.scale.x)
          dummy.updateMatrix()
          particles.setMatrixAt(index, dummy.matrix)
        }
        particles.instanceMatrix.needsUpdate = true
      }
    },
    dispose: () => {
      for (const object of [yerbaDisc, mound, wet, particles]) {
        disposeTree(object)
        object.removeFromParent()
      }
    },
  }
}
