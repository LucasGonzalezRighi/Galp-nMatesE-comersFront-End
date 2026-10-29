import type * as Three from 'three'
import type { PackModule, SceneShared, ThreeLib } from './types'
import { disposeTree } from './dispose'
import { place } from './place'

/** Foto real del frente del paquete de yerba Canarias. */
const PACK_FRONT_URL = '/hero/3d/yerba-canarias-front.jpg'

/**
 * Recorte del frente del paquete dentro de la foto, en fracciones de la imagen (la foto muestra el
 * paquete sobre una mesa): desde el borde izquierdo y desde abajo, y el ancho y el alto.
 */
const PACK_FRONT_CROP = { left: 0.306, bottom: 0.177, width: 0.408, height: 0.503 } as const

/** Colores del paquete de yerba fuera del frente: el amarillo y el verde de Canarias. */
const PACK_YELLOW = '#e6cf1d'
const PACK_GREEN = '#163628'

/** Medidas del paquete: ancho y alto con la proporción de la foto, profundidad y radio de las aristas. */
const PACK = { width: 0.56, height: 0.91, depth: 0.3, radius: 0.035 } as const

/**
 * Crea el paquete de yerba Canarias: la foto real al frente, laterales y tapas pintados, aristas
 * redondeadas y su pico (la esquina de arriba a la izquierda) como ancla de la yerba que cae. Su
 * `update` lo coloca con `state.pack` y le suma un balanceo leve.
 *
 * @param T - La biblioteca `three` que cargó `scene.ts`.
 * @param parent - Donde va el paquete (la escena).
 * @param shared - Los materiales y pintores compartidos.
 * @returns El módulo, con el pico (`spout`) ({@link PackModule}).
 */
export function createPack(
  T: ThreeLib,
  parent: Three.Object3D,
  shared: Pick<SceneShared, 'materials'>,
): PackModule {
  const { paint, load, random } = shared.materials
  // El paquete de yerba: la foto real de Canarias al frente, laterales y tapas pintados.
  const frontMap = load(PACK_FRONT_URL)
  frontMap.repeat.set(PACK_FRONT_CROP.width, PACK_FRONT_CROP.height)
  frontMap.offset.set(PACK_FRONT_CROP.left, PACK_FRONT_CROP.bottom)
  const sideMap = paint(256, 880, (g, width, height) => {
    g.fillStyle = PACK_YELLOW
    g.fillRect(0, 0, width, height)
    g.fillStyle = '#f4f0e0'
    g.fillRect(0, height * 0.58, width, 8)
    g.fillRect(0, height * 0.81, width, 8)
    g.fillStyle = PACK_GREEN
    g.fillRect(0, height * 0.59, width, height * 0.21)
    g.fillStyle = 'rgba(0,0,0,.06)'
    for (let index = 0; index < 14; index++)
      g.fillRect(random() * width, 0, 1 + random() * 2, height)
  })
  const topMap = paint(512, 256, (g, width, height) => {
    g.fillStyle = PACK_YELLOW
    g.fillRect(0, 0, width, height)
    g.strokeStyle = 'rgba(90,70,0,.28)'
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(0, height / 2)
    g.lineTo(width, height / 2)
    g.moveTo(0, 0)
    g.lineTo(width * 0.22, height / 2)
    g.lineTo(0, height)
    g.moveTo(width, 0)
    g.lineTo(width * 0.78, height / 2)
    g.lineTo(width, height)
    g.stroke()
  })
  const wrapping = (map: Three.Texture): Three.MeshPhysicalMaterial =>
    new T.MeshPhysicalMaterial({
      map,
      roughness: 0.42,
      clearcoat: 0.7,
      clearcoatRoughness: 0.25,
      sheen: 0.2,
    })
  const frontMaterial = wrapping(frontMap)
  const sideMaterial = wrapping(sideMap)
  const topMaterial = wrapping(topMap)
  const packGeometry = roundedPack(T)
  const pack = new T.Mesh(packGeometry, [
    sideMaterial,
    sideMaterial,
    topMaterial,
    topMaterial,
    frontMaterial,
    frontMaterial,
  ])
  pack.name = 'yerba'
  parent.add(pack)
  // El pico por donde cae la yerba: la esquina de arriba del paquete.
  const spout = new T.Object3D()
  spout.position.set(-0.22, 0.5, 0)
  pack.add(spout)

  return {
    spout,
    update: (frame) => {
      // El paquete, con un balanceo leve.
      place(pack, frame.state.pack, frame)
      pack.rotation.y += Math.sin(frame.t * 0.5) * 0.08
      pack.updateMatrixWorld(true)
    },
    dispose: () => {
      disposeTree(pack)
      pack.removeFromParent()
    },
  }
}

/**
 * La caja del paquete con las aristas redondeadas y las caras apenas infladas, como un paquete de
 * papel lleno: cada vértice de una caja subdividida se lleva a una caja redondeada de radio
 * `PACK.radius` y se empuja hacia afuera en el centro de las caras.
 */
function roundedPack(T: ThreeLib): Three.BoxGeometry {
  const { width, height, depth, radius } = PACK
  const geometry = new T.BoxGeometry(width, height, depth, 16, 24, 8)
  const positions = geometry.getAttribute('position')
  const vertex = new T.Vector3()
  const inner = new T.Vector3()
  const clampAxis = (value: number, half: number): number =>
    Math.max(-half + radius, Math.min(half - radius, value))
  for (let index = 0; index < positions.count; index++) {
    vertex.fromBufferAttribute(positions, index)
    inner.set(
      clampAxis(vertex.x, width / 2),
      clampAxis(vertex.y, height / 2),
      clampAxis(vertex.z, depth / 2),
    )
    const normal = vertex.clone().sub(inner)
    if (normal.lengthSq() > 0) vertex.copy(inner).add(normal.normalize().multiplyScalar(radius))
    const ux = vertex.x / (width / 2)
    const uy = vertex.y / (height / 2)
    vertex.z += Math.sign(vertex.z) * (1 - ux * ux) * (1 - uy * uy * 0.6) * 0.018
    vertex.x += Math.sign(vertex.x) * (1 - uy * uy) * 0.006
    positions.setXYZ(index, vertex.x, vertex.y, vertex.z)
  }
  geometry.computeVertexNormals()
  return geometry
}
