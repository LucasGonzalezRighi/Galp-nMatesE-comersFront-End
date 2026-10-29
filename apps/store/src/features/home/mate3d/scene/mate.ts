import type * as Three from 'three'
import type { MateModule, SceneShared, ThreeLib } from './types'
import { disposeTree } from './dispose'

/** Foto del interior curado del mate (el fondo antes de la yerba). */
const INTERIOR_URL = '/hero/3d/mate-interior.png'

/** Altura de la boca (el borde del aro) en coordenadas del cuerpo del mate. */
const MOUTH_Y = 1.01

/** Radio de la yerba adentro de la boca (el del disco de yerba), en coordenadas del cuerpo. */
const INTERIOR_RADIUS = 0.4

/**
 * Crea el Mate Imperial Premium: calabaza forrada en cuero negro, virola de alpaca cincelada, aro y
 * cordón, interior curado, pared interior, bandas y patas de cuero con bolitas de bronce, y la sombra
 * bajo el mate. `scene.ts` coloca `mateRoot` con `state.mate` (más el parallax) antes de los
 * `update`; este `update` solo lleva la sombra debajo.
 *
 * @param T - La biblioteca `three` que cargó `scene.ts`.
 * @param parent - Donde va el mate (la escena).
 * @param shared - Los materiales compartidos.
 * @returns El módulo, con `mateRoot`, `mate`, `mouthY` e `interiorRadius` ({@link MateModule}).
 */
export function createMate(
  T: ThreeLib,
  parent: Three.Object3D,
  shared: Pick<SceneShared, 'materials'>,
): MateModule {
  const { leather, alpaca, smoothAlpaca, bronze, curedMap, shadowMap, load } = shared.materials
  // El mate: `mateRoot` se coloca y gira; `mate` baja para que el centro quede a media altura.
  const mateRoot = new T.Group()
  const mate = new T.Group()
  mate.position.y = -0.58
  mateRoot.add(mate)
  parent.add(mateRoot)
  const profile = [
    [0, 0.1],
    [0.16, 0.1],
    [0.29, 0.16],
    [0.39, 0.27],
    [0.445, 0.41],
    [0.458, 0.52],
    [0.448, 0.63],
    [0.425, 0.72],
    [0.408, 0.79],
  ].map(([radius = 0, y = 0]) => new T.Vector2(radius, y))
  mate.add(new T.Mesh(new T.LatheGeometry(profile, 96), leather))
  const rimBand = new T.Mesh(new T.CylinderGeometry(0.432, 0.428, 0.23, 128, 1, true), alpaca)
  rimBand.position.y = 0.895
  mate.add(rimBand)
  const rimInside = new T.Mesh(
    new T.CylinderGeometry(0.402, 0.402, 0.22, 96, 1, true),
    smoothAlpaca,
  )
  rimInside.position.y = 0.895
  mate.add(rimInside)
  const lip = new T.Mesh(new T.TorusGeometry(0.417, 0.016, 16, 128), smoothAlpaca)
  lip.rotation.x = Math.PI / 2
  lip.position.y = MOUTH_Y
  mate.add(lip)
  const bead = new T.Mesh(new T.TorusGeometry(0.432, 0.009, 12, 128), bronze)
  bead.rotation.x = Math.PI / 2
  bead.position.y = 0.782
  mate.add(bead)
  const interior = new T.Mesh(
    new T.CircleGeometry(0.402, 64),
    new T.MeshStandardMaterial({ name: 'curado', map: load(INTERIOR_URL), roughness: 0.9 }),
  )
  interior.rotation.x = -Math.PI / 2
  interior.position.y = 0.56
  mate.add(interior)
  const wall = new T.Mesh(
    new T.CylinderGeometry(0.4, 0.38, 0.25, 64, 1, true),
    new T.MeshStandardMaterial({ map: curedMap, roughness: 0.9, side: T.BackSide }),
  )
  wall.position.y = 0.675
  mate.add(wall)
  for (const angle of [Math.PI / 4, -Math.PI / 4]) {
    const band = new T.Mesh(new T.BoxGeometry(0.8, 0.05, 0.07), alpaca)
    band.position.y = 0.1
    band.rotation.y = angle
    mate.add(band)
  }
  // Las cuatro patas de cuero con su bolita de bronce.
  for (let index = 0; index < 4; index++) {
    const angle = Math.PI / 4 + (index * Math.PI) / 2
    const ball = new T.Mesh(new T.SphereGeometry(0.058, 32, 16), bronze)
    ball.position.set(Math.cos(angle) * 0.4, 0.058, Math.sin(angle) * 0.4)
    mate.add(ball)
    const leg = new T.Mesh(new T.CylinderGeometry(0.05, 0.07, 0.16, 16), leather)
    leg.position.set(Math.cos(angle) * 0.3, 0.15, Math.sin(angle) * 0.3)
    leg.rotation.set(Math.sin(angle) * 0.5, 0, -Math.cos(angle) * 0.5)
    mate.add(leg)
  }
  const shadow = new T.Mesh(
    new T.PlaneGeometry(1.5, 0.3),
    new T.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false }),
  )
  parent.add(shadow)
  const point = new T.Vector3()

  return {
    mateRoot,
    mate,
    mouthY: MOUTH_Y,
    interiorRadius: INTERIOR_RADIUS,
    update: () => {
      // La sombra bajo el mate.
      mateRoot.localToWorld(point.set(0, -0.58, 0))
      shadow.position.set(point.x, point.y - 0.02, -0.4)
      shadow.scale.setScalar(mateRoot.scale.x)
    },
    dispose: () => {
      disposeTree(mateRoot)
      disposeTree(shadow)
      mateRoot.removeFromParent()
      shadow.removeFromParent()
    },
  }
}
