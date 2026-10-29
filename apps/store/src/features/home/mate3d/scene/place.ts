import type * as Three from 'three'
import type { MatePlacement } from '../keyframes'
import type { SceneView } from './types'

/** Radianes por grado. */
const RADIANS_PER_DEGREE = Math.PI / 180

/**
 * Coloca una pieza con su `[x, y, escala, giros]` en fracciones de media pantalla (ver
 * `MatePlacement`): `x` e `y` en el plano `z = 0`, la escala y los giros en grados (orden XYZ: el
 * giro Z inclina la pieza en su propio eje antes de los otros dos). En pantalla angosta junta `x` al
 * centro (0,6) y achica la escala (0,75).
 *
 * No valida: corre en cada cuadro con el estado que `setState` ya validó, y un error adentro del
 * bucle de `requestAnimationFrame` dejaría la escena sin dibujar.
 *
 * @param object - La pieza; se pisan su posición, su giro y su escala.
 * @param placement - Dónde va y cómo gira.
 * @param view - Las medidas de la pantalla (un {@link SceneView}; el `frame` de cada cuadro sirve).
 */
export function place(object: Three.Object3D, placement: MatePlacement, view: SceneView): void {
  const [x, y, scale, rotateX, rotateY, rotateZ] = placement
  const { halfWidth, halfHeight, narrow } = view
  object.position.set(x * halfWidth * (narrow ? 0.6 : 1), y * halfHeight, 0)
  object.rotation.set(
    rotateX * RADIANS_PER_DEGREE,
    rotateY * RADIANS_PER_DEGREE,
    rotateZ * RADIANS_PER_DEGREE,
  )
  object.scale.setScalar(scale * (narrow ? 0.75 : 1))
}
