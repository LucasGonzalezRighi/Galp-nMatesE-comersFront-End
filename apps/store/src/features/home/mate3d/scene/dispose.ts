import type * as Three from 'three'

/**
 * Libera las geometrías, los materiales y las instancias (`InstancedMesh`) de un árbol de objetos.
 * Liberar dos veces lo mismo no hace nada, así que un material compartido puede pasar por acá desde
 * más de un módulo.
 *
 * @param root - La raíz del árbol; se recorre entera.
 */
export function disposeTree(root: Three.Object3D): void {
  root.traverse((object) => {
    if ('isInstancedMesh' in object) (object as Three.InstancedMesh).dispose()
    if (!('geometry' in object) || !('material' in object)) return
    const { geometry, material } = object as Three.Mesh
    geometry.dispose()
    for (const item of Array.isArray(material) ? material : [material]) item.dispose()
  })
}
