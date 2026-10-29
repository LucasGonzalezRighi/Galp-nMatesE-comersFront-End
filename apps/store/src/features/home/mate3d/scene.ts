'use client'

import type { MatePlacement, MateState } from './keyframes'
import type { SceneFrame, SceneModule } from './scene/types'
import { lerpMateState, MATE_KEYFRAMES } from './keyframes'
import { createBombilla } from './scene/bombilla'
import { disposeTree } from './scene/dispose'
import { createMate } from './scene/mate'
import { createMaterials } from './scene/materials'
import { createPack } from './scene/pack'
import { place } from './scene/place'
import { smoothingShare } from './scene/smoothing'
import { createWater } from './scene/water'
import { createYerba } from './scene/yerba'

/** Lo que la feature puede hacer con la escena ya creada. */
export interface MateSceneApi {
  /**
   * Cambia el estado objetivo; la escena se acerca a él con un suavizado por tiempo (el 5,5 % por
   * cuadro a 60 Hz), así el scroll se ve suave aunque llegue a saltos.
   *
   * @throws {RangeError} Si algún número del estado no es finito.
   */
  setState: (state: MateState) => void
  /**
   * Mueve el parallax del puntero: `x` e `y` de −1 (izquierda, arriba) a 1 (derecha, abajo).
   *
   * @throws {RangeError} Si `x` o `y` no son números de −1 a 1.
   */
  setPointer: (x: number, y: number) => void
  /** Pausa (`false`) o reanuda (`true`) el dibujo cuadro a cuadro. */
  setVisible: (visible: boolean) => void
  /** Vuelve a medir el lienzo; se llama cuando cambia su tamaño. */
  resize: () => void
  /** Detiene el dibujo y libera geometrías, materiales, texturas y el renderer. */
  dispose: () => void
}

/** El renderer dibuja a lo sumo a 1,5 veces la resolución: más no se nota y cuesta cuadros. */
const MAX_PIXEL_RATIO = 1.5

/** Medio campo visual vertical de la cámara, en grados (28° en total, como el diseño). */
const HALF_FOV = 14

/** Distancia de la cámara al plano de la escena. */
const CAMERA_Z = 7

/** El cuadro más largo que cuenta, en segundos: tras una pausa larga la escena no salta de golpe. */
const MAX_FRAME_SECONDS = 0.1

/** Lanza `RangeError` si algún número del estado no es finito. */
function assertFiniteState(state: MateState): void {
  const values = [
    ...state.mate,
    ...state.bombilla,
    ...state.pack,
    ...state.thermos,
    state.attached,
    state.fill,
    state.slope,
    state.wall,
    state.wet,
    state.water,
    state.steam,
    state.puddle,
    state.splash,
    state.pour,
    state.tilt,
  ]
  if (!values.every(Number.isFinite)) {
    throw new RangeError('El estado del mate 3D tiene un número que no es finito.')
  }
}

/**
 * Crea la escena 3D del Mate Imperial Premium sobre un lienzo: calabaza forrada en cuero negro,
 * virola de alpaca cincelada, aro y pies de bronce, interior curado, yerba con montañita y mancha
 * húmeda, bombilla de alpaca y bronce, el paquete de yerba Canarias, partículas de yerba, chorro de
 * agua, vapor y sombra, con una luz de estudio propia para los reflejos del metal. Es el porte de
 * `docs/design/galpon-tienda-v3/mate3d-scene.js`, partido en los módulos de `scene/` (ver el README
 * de `mate3d`): acá quedan el renderer, la cámara, el estudio, las luces, el suavizado y el bucle.
 *
 * Carga `three` con `import()` recién al llamarla (un chunk aparte, nunca en el servidor) y empieza a
 * dibujar enseguida con el estado del primer momento; quien la usa le pasa el estado del scroll con
 * `setState` y la pausa con `setVisible(false)` cuando no se ve.
 *
 * @param canvas - El lienzo donde dibujar; la escena toma su tamaño (`clientWidth` y `clientHeight`).
 * @returns La API de la escena ({@link MateSceneApi}).
 * @throws {Error} (como promesa rechazada) Si no se puede crear el contexto WebGL o un lienzo 2D.
 */
export async function createMateScene(canvas: HTMLCanvasElement): Promise<MateSceneApi> {
  const T = await import('three')
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1))
  renderer.outputColorSpace = T.SRGBColorSpace
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  const scene = new T.Scene()
  const camera = new T.PerspectiveCamera(HALF_FOV * 2, 1, 0.1, 60)
  camera.position.set(0, 0, CAMERA_Z)

  // Entorno de estudio propio (softboxes) para reflejos realistas en la alpaca.
  const pmrem = new T.PMREMGenerator(renderer)
  const studio = new T.Scene()
  studio.add(
    new T.Mesh(
      new T.BoxGeometry(12, 12, 12),
      new T.MeshBasicMaterial({ color: 0x2a1c14, side: T.BackSide }),
    ),
  )
  const softbox = (
    width: number,
    height: number,
    color: number,
    intensity: number,
    position: readonly [number, number, number],
  ): void => {
    const material = new T.MeshBasicMaterial({
      color: new T.Color(color).multiplyScalar(intensity),
      side: T.DoubleSide,
    })
    const box = new T.Mesh(new T.PlaneGeometry(width, height), material)
    box.position.set(...position)
    box.lookAt(0, 0, 0)
    studio.add(box)
  }
  softbox(4, 3, 0xffe0bc, 7, [-4, 3, 3.5])
  softbox(2.5, 5, 0xfff3e4, 3.5, [4.5, 0.5, 2])
  softbox(7, 1.4, 0xd6efbd, 2.4, [0, -1, -5])
  softbox(6, 6, 0xffffff, 1.2, [0, 5.5, 0])
  const environment = pmrem.fromScene(studio, 0.03)
  scene.environment = environment.texture
  pmrem.dispose()
  disposeTree(studio)

  const key = new T.DirectionalLight(0xffd6a6, 2.2)
  key.position.set(-3, 4, 5)
  scene.add(key)
  const rim = new T.DirectionalLight(0xc6e59a, 1.7)
  rim.position.set(4, 2.5, -4)
  scene.add(rim)
  scene.add(new T.HemisphereLight(0xfff0e0, 0x2a1a10, 0.3))

  // Los módulos, en el orden en que se crean y se acomodan cada cuadro: el paquete antes que la yerba
  // (la yerba cae de su pico) y la yerba antes que la bombilla y el agua (leen su hueco).
  const materials = createMaterials(T)
  const mate = createMate(T, scene, { materials })
  const pack = createPack(T, scene, { materials })
  const yerba = createYerba(T, scene, { materials, mate, pack })
  const shared = { materials, mate, pack, yerba }
  const parts: readonly SceneModule[] = [
    mate,
    pack,
    yerba,
    createBombilla(T, scene, shared),
    createWater(T, scene, shared),
  ]
  const { mateRoot } = mate
  const degrees = T.MathUtils.degToRad

  let target: MateState = MATE_KEYFRAMES[0].state
  let current: MateState | null = null
  let pointerX = 0
  let pointerY = 0
  let frameId = 0
  let lastTime: number | null = null
  let disposed = false

  const draw = (time: number): void => {
    const t = time / 1000
    const dt = lastTime === null ? 0 : Math.min(MAX_FRAME_SECONDS, Math.max(0, t - lastTime))
    lastTime = t
    current = current === null ? target : lerpMateState(current, target, smoothingShare(dt))
    const state = current
    const halfHeight = Math.tan(degrees(HALF_FOV)) * CAMERA_Z
    const halfWidth = halfHeight * camera.aspect
    const narrow = camera.aspect < 0.9

    // El mate, con el parallax del puntero, un vaivén lento y una flotación leve.
    const [, , mateScale, mateRotateX, mateRotateY, mateRotateZ] = state.mate
    const matePlacement: MatePlacement = narrow
      ? [0, -0.38, mateScale, mateRotateX, mateRotateY, mateRotateZ]
      : state.mate
    place(mateRoot, matePlacement, { halfWidth, halfHeight, narrow })
    mateRoot.rotation.x += degrees(pointerY * 6)
    mateRoot.rotation.y += degrees(pointerX * 16 + Math.sin(t * 0.6) * 6)
    mateRoot.position.y += Math.sin(t * 1.1) * 0.02
    mateRoot.updateMatrixWorld(true)

    const frame: SceneFrame = {
      state,
      t,
      dt,
      halfWidth,
      halfHeight,
      narrow,
      mateRoot,
      mate: mate.mate,
    }
    for (const part of parts) part.update(frame)

    renderer.render(scene, camera)
  }

  const loop = (time: number): void => {
    frameId = requestAnimationFrame(loop)
    draw(time)
  }

  const resize = (): void => {
    const width = canvas.clientWidth || window.innerWidth
    const height = canvas.clientHeight || window.innerHeight
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  const setVisible = (visible: boolean): void => {
    if (!visible || disposed) {
      cancelAnimationFrame(frameId)
      frameId = 0
      // Al reanudar, el primer cuadro no cuenta el tiempo de la pausa.
      lastTime = null
      return
    }
    if (frameId === 0) frameId = requestAnimationFrame(loop)
  }

  resize()
  setVisible(true)

  return {
    setState: (state) => {
      assertFiniteState(state)
      target = state
    },
    setPointer: (x, y) => {
      if (![x, y].every((value) => Number.isFinite(value) && Math.abs(value) <= 1)) {
        throw new RangeError(
          `El puntero del mate 3D va de −1 a 1 en cada eje; se recibió (${String(x)}, ${String(y)}).`,
        )
      }
      // El diseño usa medio recorrido (de −0,5 a 0,5).
      pointerX = x / 2
      pointerY = y / 2
    },
    setVisible,
    resize,
    dispose: () => {
      if (disposed) return
      setVisible(false)
      disposed = true
      for (const part of parts) part.dispose()
      disposeTree(scene)
      materials.dispose()
      environment.dispose()
      renderer.dispose()
    },
  }
}
