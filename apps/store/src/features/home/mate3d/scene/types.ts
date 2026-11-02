import type * as Three from 'three'
import type { MateState } from '../keyframes'

/** La biblioteca `three` que `scene.ts` carga con `import()` y les pasa a los módulos (`T`). */
export type ThreeLib = typeof Three

/** Dibuja en un lienzo 2D de `width` × `height` (los pintores de texturas). */
export type Painter = (context: CanvasRenderingContext2D, width: number, height: number) => void

/** Las medidas de la pantalla con que se colocan las piezas (ver `place`). */
export interface SceneView {
  /** Medio ancho visible en el plano de la escena (`z = 0`), en unidades de la escena. */
  readonly halfWidth: number
  /** Medio alto visible en el plano de la escena (`z = 0`), en unidades de la escena. */
  readonly halfHeight: number
  /** Si la pantalla es angosta (celular de pie): las piezas se juntan al centro y se achican. */
  readonly narrow: boolean
}

/** Lo que cada módulo recibe en cada cuadro, en `update(frame)`. */
export interface SceneFrame extends SceneView {
  /** El estado ya suavizado (no el objetivo del scroll): todo lo que se ve sale de acá y de `t`. */
  readonly state: MateState
  /** Segundos del reloj de `requestAnimationFrame`; para ciclos y vaivenes, nunca para acumular. */
  readonly t: number
  /** Segundos desde el cuadro anterior: 0 en el primero y al reanudar, 0,1 como máximo. */
  readonly dt: number
  /** El grupo que se coloca y gira con `state.mate` (ya colocado y con su matriz al día). */
  readonly mateRoot: Three.Group
  /** El cuerpo del mate dentro de `mateRoot`: sus coordenadas locales tienen el piso en `y = 0`. */
  readonly mate: Three.Group
}

/** Lo que devuelve cada módulo de la escena: `create(T, parent, shared) → { update, dispose }`. */
export interface SceneModule {
  /** Acomoda sus piezas para el cuadro; lo llama `scene.ts` una vez por cuadro, en orden. */
  readonly update: (frame: SceneFrame) => void
  /** Libera sus geometrías, materiales e instancias y saca sus piezas de la escena. */
  readonly dispose: () => void
}

/** Los materiales y texturas compartidos y los pintores para hacer más (ver `materials.ts`). */
export interface SceneMaterials {
  /** Cuero negro del Imperial Premium. */
  readonly leather: Three.MeshPhysicalMaterial
  /** Alpaca cincelada de la virola y las bandas. */
  readonly alpaca: Three.MeshStandardMaterial
  /** Alpaca lisa (aro, borde, bombilla). */
  readonly smoothAlpaca: Three.MeshStandardMaterial
  /** Bronce (cordón, bolitas, anillos de la bombilla). */
  readonly bronze: Three.MeshStandardMaterial
  /** La foto real de la yerba (`yerba-albedo.jpg`), en mosaico de 1,3, girada y corrida. */
  readonly yerbaAlbedo: Three.Texture
  /** El curado de la pared interior del mate. */
  readonly curedMap: Three.Texture
  /** Mancha blanda para la sombra bajo el mate. */
  readonly shadowMap: Three.Texture
  /** El azar con semilla del diseño: las texturas pintadas se ven siempre iguales. */
  readonly random: () => number
  /** Pinta una textura en un lienzo 2D (en mosaico, `anisotropy` 8; sRGB salvo `srgb = false`). */
  readonly paint: (width: number, height: number, draw: Painter, srgb?: boolean) => Three.Texture
  /** Carga una foto como textura sRGB (`anisotropy` 8). */
  readonly load: (url: string) => Three.Texture
  /** Pinta un degradé radial de 128 × 128 con esas paradas `[posición, color]`. */
  readonly radial: (stops: readonly (readonly [number, string])[]) => Three.Texture
  /** Libera los materiales compartidos y todas las texturas hechas con `paint`, `load` o `radial`. */
  readonly dispose: () => void
}

/** El módulo del mate: además de `update` y `dispose`, el grupo del mate y sus medidas. */
export interface MateModule extends SceneModule {
  /** El grupo que se coloca y gira con `state.mate`. */
  readonly mateRoot: Three.Group
  /** El cuerpo del mate (piso en `y = 0`): la yerba y el ancla de la bombilla van adentro. */
  readonly mate: Three.Group
  /** Altura de la boca (el borde del aro) en coordenadas de `mate`. */
  readonly mouthY: number
  /** Radio de la yerba adentro de la boca, en coordenadas de `mate`. */
  readonly interiorRadius: number
}

/** El módulo del paquete: además de `update` y `dispose`, el pico por donde cae la yerba. */
export interface PackModule extends SceneModule {
  /** El pico del paquete (hijo del paquete): su posición en mundo es de donde sale la yerba. */
  readonly spout: Three.Object3D
}

/** El módulo de la yerba: además de `update` y `dispose`, el centro del hueco. */
export interface YerbaModule extends SceneModule {
  /**
   * El centro del hueco donde se calza la bombilla y cae el agua, en coordenadas de `mate`; se
   * actualiza en cada `update` de la yerba (los módulos que lo leen van después).
   */
  readonly hollowCenter: Three.Vector3
}

/** Lo que un módulo necesita de otros: los materiales y lo que exponen el mate, el paquete y la yerba. */
export interface SceneShared {
  /** Materiales, texturas y pintores. */
  readonly materials: SceneMaterials
  /** El mate (`mouthY`, `interiorRadius`, los grupos). */
  readonly mate: MateModule
  /** El paquete (`spout`). */
  readonly pack: PackModule
  /** La yerba (`hollowCenter`). */
  readonly yerba: YerbaModule
}
