'use client'

import type * as Three from 'three'
import type { MatePlacement, MateState } from './keyframes'
import { lerpMateState, MATE_KEYFRAMES } from './keyframes'

/** Lo que la feature puede hacer con la escena ya creada. */
export interface MateSceneApi {
  /**
   * Cambia el estado objetivo; cada cuadro la escena se acerca un 5,5 % a él, así el scroll se ve
   * suave aunque llegue a saltos.
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

/** Foto del interior curado del mate (el fondo antes de la yerba). */
const INTERIOR_URL = '/hero/3d/mate-interior.png'

/** Foto real del frente del paquete de yerba Canarias. */
const PACK_FRONT_URL = '/hero/3d/yerba-canarias-front.jpg'

/**
 * Recorte del frente del paquete dentro de la foto, en fracciones de la imagen (la foto muestra el
 * paquete sobre una mesa): desde el borde izquierdo y desde abajo, y el ancho y el alto.
 */
const PACK_FRONT_CROP = { left: 0.306, bottom: 0.177, width: 0.408, height: 0.503 } as const

/**
 * Cuero negro del Imperial Premium: el `Negro` de `leathers3d` (#3a2016) más oscuro y menos
 * saturado, para que en la luz de estudio se lea negro y no marrón.
 */
const LEATHER_COLOR = '#1b1410'

/** Brillo cobre leve del cuero. */
const LEATHER_SHEEN = '#c08050'

/** Cuánto se acerca la escena al estado objetivo en cada cuadro (el 0,055 del diseño). */
const SMOOTHING = 0.055

/** El renderer dibuja a lo sumo a 1,5 veces la resolución: más no se nota y cuesta cuadros. */
const MAX_PIXEL_RATIO = 1.5

/** Partículas de yerba que caen del paquete. */
const PARTICLE_COUNT = 80

/** Nubes de vapor. */
const STEAM_COUNT = 9

/** Medio campo visual vertical de la cámara, en grados (28° en total, como el diseño). */
const HALF_FOV = 14

/** Distancia de la cámara al plano de la escena. */
const CAMERA_Z = 7

/** Colores del paquete de yerba fuera del frente: el amarillo y el verde de Canarias. */
const PACK_YELLOW = '#e6cf1d'
const PACK_GREEN = '#163628'

/** Medidas del paquete: ancho y alto con la proporción de la foto, profundidad y radio de las aristas. */
const PACK = { width: 0.56, height: 0.91, depth: 0.3, radius: 0.035 } as const

/** Dibuja en un lienzo 2D de `width` × `height`. */
type Painter = (context: CanvasRenderingContext2D, width: number, height: number) => void

/** Recorta un número entre 0 y 1. */
function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/** Interpola entre dos números. */
function lerp(from: number, to: number, share: number): number {
  return from + (to - from) * share
}

/** Lanza `RangeError` si algún número del estado no es finito. */
function assertFiniteState(state: MateState): void {
  const values = [
    ...state.mate,
    ...state.bombilla,
    ...state.pack,
    state.attached,
    state.fill,
    state.mound,
    state.wet,
    state.water,
    state.steam,
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
 * `docs/design/galpon-tienda-v3/mate3d-scene.js`.
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

  // Texturas procedurales: el mismo azar con semilla del diseño, así se ven siempre iguales.
  let seed = 7
  const random = (): number => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const textures: Three.Texture[] = []
  const paint = (width: number, height: number, draw: Painter, srgb = true): Three.Texture => {
    const surface = document.createElement('canvas')
    surface.width = width
    surface.height = height
    const context = surface.getContext('2d')
    if (context === null) throw new Error('El navegador no dio un lienzo 2D para las texturas.')
    draw(context, width, height)
    const texture = new T.CanvasTexture(surface)
    if (srgb) texture.colorSpace = T.SRGBColorSpace
    texture.wrapS = T.RepeatWrapping
    texture.wrapT = T.RepeatWrapping
    texture.anisotropy = 8
    textures.push(texture)
    return texture
  }
  const load = (url: string): Three.Texture => {
    const texture = new T.TextureLoader().load(url)
    texture.colorSpace = T.SRGBColorSpace
    texture.anisotropy = 8
    textures.push(texture)
    return texture
  }
  const radial = (stops: readonly (readonly [number, string])[]): Three.Texture =>
    paint(128, 128, (g, width, height) => {
      const gradient = g.createRadialGradient(64, 64, 0, 64, 64, 64)
      for (const [offset, color] of stops) gradient.addColorStop(offset, color)
      g.fillStyle = gradient
      g.fillRect(0, 0, width, height)
    })

  const grainMap = paint(512, 512, (g, width, height) => {
    g.fillStyle = '#e6e0da'
    g.fillRect(0, 0, width, height)
    for (let index = 0; index < 9000; index++) {
      g.fillStyle = random() < 0.5 ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.05)'
      g.fillRect(random() * width, random() * height, 1 + random() * 3, 1 + random() * 3)
    }
    for (let index = 0; index < 60; index++) {
      g.strokeStyle = `rgba(0,0,0,${String(0.03 + random() * 0.05)})`
      g.lineWidth = 1 + random() * 4
      const x = random() * width
      g.beginPath()
      g.moveTo(x, 0)
      g.bezierCurveTo(x + 20, height * 0.3, x - 20, height * 0.6, x + 10, height)
      g.stroke()
    }
  })
  // El cincelado de la virola: rombos, óvalos y círculos entre dos filas de puntos.
  const engraving = (light: boolean): Three.Texture =>
    paint(
      1024,
      128,
      (g, width) => {
        g.fillStyle = light ? '#ffffff' : '#808080'
        g.fillRect(0, 0, width, 128)
        g.strokeStyle = light ? '#8a8378' : '#2a2a2a'
        g.fillStyle = g.strokeStyle
        g.lineWidth = 3
        for (let x = 0; x < width; x += 128) {
          g.beginPath()
          g.moveTo(x + 64, 22)
          g.lineTo(x + 100, 64)
          g.lineTo(x + 64, 106)
          g.lineTo(x + 28, 64)
          g.closePath()
          g.stroke()
          g.beginPath()
          g.ellipse(x + 64, 64, 14, 22, 0, 0, Math.PI * 2)
          g.stroke()
          g.beginPath()
          g.arc(x, 64, 18, 0, Math.PI * 2)
          g.stroke()
          for (let dot = 0; dot < 8; dot++) {
            g.beginPath()
            g.arc(x + dot * 16 + 8, 10, 2.5, 0, Math.PI * 2)
            g.fill()
            g.beginPath()
            g.arc(x + dot * 16 + 8, 118, 2.5, 0, Math.PI * 2)
            g.fill()
          }
        }
      },
      light,
    )
  const yerbaMap = paint(256, 256, (g, width, height) => {
    g.fillStyle = '#5f7a26'
    g.fillRect(0, 0, width, height)
    const colors = ['#7f9b34', '#a8bd5c', '#46591b', '#c3cf80', '#6b8a2c'] as const
    for (let index = 0; index < 5000; index++) {
      g.fillStyle = colors[Math.floor(random() * colors.length)] ?? colors[0]
      g.fillRect(random() * width, random() * height, 1 + random() * 3, 1 + random() * 2)
    }
  })
  const curedMap = paint(512, 512, (g, width, height) => {
    const gradient = g.createRadialGradient(
      width / 2,
      height / 2,
      10,
      width / 2,
      height / 2,
      width / 2,
    )
    gradient.addColorStop(0, '#4a3418')
    gradient.addColorStop(0.6, '#3a2812')
    gradient.addColorStop(1, '#22160a')
    g.fillStyle = gradient
    g.fillRect(0, 0, width, height)
    const colors = [
      'rgba(110,130,40,.35)',
      'rgba(70,90,25,.4)',
      'rgba(150,120,60,.25)',
      'rgba(20,12,5,.35)',
    ] as const
    for (let index = 0; index < 2600; index++) {
      g.fillStyle = colors[Math.floor(random() * colors.length)] ?? colors[0]
      g.beginPath()
      g.arc(random() * width, random() * height, 1 + random() * 5, 0, Math.PI * 2)
      g.fill()
    }
  })
  const steamMap = radial([
    [0, 'rgba(255,250,240,.55)'],
    [0.5, 'rgba(255,250,240,.18)'],
    [1, 'rgba(255,250,240,0)'],
  ])
  const shadowMap = radial([
    [0, 'rgba(0,0,0,.65)'],
    [0.6, 'rgba(0,0,0,.2)'],
    [1, 'rgba(0,0,0,0)'],
  ])

  // Materiales.
  const leather = new T.MeshPhysicalMaterial({
    name: 'cuero',
    color: LEATHER_COLOR,
    map: grainMap,
    roughness: 0.5,
    clearcoat: 0.6,
    clearcoatRoughness: 0.35,
    sheen: 0.35,
    sheenColor: new T.Color(LEATHER_SHEEN),
    // Ajuste de la Task 2 (visto en la tienda compilada): con el brillo cobre repartido en toda la
    // superficie, el cuero se leía marrón. Con `sheenRoughness` en 0,4 el brillo queda concentrado
    // en los bordes y el cuero se lee negro con su veta cobre. El reflejo del estudio no se toca: es
    // `scene.environment` (el material no lleva `envMap`, así que `envMapIntensity` no haría nada).
    sheenRoughness: 0.4,
  })
  const bump = engraving(false)
  const engravedColor = engraving(true)
  bump.repeat.set(3, 1)
  engravedColor.repeat.set(3, 1)
  const alpaca = new T.MeshStandardMaterial({
    name: 'alpaca',
    color: '#ddd6ca',
    metalness: 1,
    roughness: 0.26,
    map: engravedColor,
    bumpMap: bump,
    bumpScale: 2.2,
    side: T.DoubleSide,
  })
  const smoothAlpaca = new T.MeshStandardMaterial({
    name: 'alpaca-lisa',
    color: '#e2dccf',
    metalness: 1,
    roughness: 0.2,
  })
  const bronze = new T.MeshStandardMaterial({
    name: 'bronce',
    color: '#d4a64e',
    metalness: 1,
    roughness: 0.28,
  })
  const yerba = new T.MeshStandardMaterial({ name: 'yerba', map: yerbaMap, roughness: 0.95 })

  // El mate: `mateRoot` se coloca y gira; `mate` baja para que el centro quede a media altura.
  const mateRoot = new T.Group()
  const mate = new T.Group()
  mate.position.y = -0.58
  mateRoot.add(mate)
  scene.add(mateRoot)
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
  lip.position.y = 1.01
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
  const yerbaDisc = new T.Mesh(new T.CircleGeometry(0.4, 64), yerba)
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
  // Dónde se calza la bombilla: contra la montañita, apenas inclinada.
  const attach = new T.Object3D()
  attach.position.set(-0.16, 0.5, 0.06)
  attach.rotation.z = T.MathUtils.degToRad(13)
  mate.add(attach)
  const shadow = new T.Mesh(
    new T.PlaneGeometry(1.5, 0.3),
    new T.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false }),
  )
  scene.add(shadow)

  // La bombilla, con el origen en la pala.
  const bombilla = new T.Group()
  scene.add(bombilla)
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
  scene.add(pack)
  // El pico por donde cae la yerba: la esquina de arriba del paquete.
  const spout = new T.Object3D()
  spout.position.set(-0.22, 0.5, 0)
  pack.add(spout)

  // Partículas de yerba, chorro de agua y vapor.
  const particles = new T.InstancedMesh(
    new T.BoxGeometry(0.022, 0.007, 0.016),
    yerba,
    PARTICLE_COUNT,
  )
  scene.add(particles)
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
  scene.add(water)
  const steams = Array.from({ length: STEAM_COUNT }, () => {
    const cloud = new T.Sprite(
      new T.SpriteMaterial({ map: steamMap, transparent: true, depthWrite: false, opacity: 0 }),
    )
    scene.add(cloud)
    return cloud
  })

  const dummy = new T.Object3D()
  const from = new T.Vector3()
  const to = new T.Vector3()
  const fromRotation = new T.Quaternion()
  const toRotation = new T.Quaternion()
  const scratchScale = new T.Vector3()
  const attachScale = new T.Vector3()
  const degrees = T.MathUtils.degToRad

  let target: MateState = MATE_KEYFRAMES[0].state
  let current: MateState | null = null
  let pointerX = 0
  let pointerY = 0
  let frameId = 0
  let disposed = false

  /** Coloca una pieza con su `[x, y, escala, giros]` en fracciones de media pantalla. */
  const place = (
    object: Three.Object3D,
    placement: MatePlacement,
    halfWidth: number,
    halfHeight: number,
    narrow: boolean,
  ): void => {
    const [x, y, scale, rotateX, rotateY, rotateZ] = placement
    object.position.set(x * halfWidth * (narrow ? 0.6 : 1), y * halfHeight, 0)
    object.rotation.set(degrees(rotateX), degrees(rotateY), degrees(rotateZ))
    object.scale.setScalar(scale * (narrow ? 0.75 : 1))
  }

  const draw = (time: number): void => {
    const t = time / 1000
    current = current === null ? target : lerpMateState(current, target, SMOOTHING)
    const state = current
    const halfHeight = Math.tan(degrees(HALF_FOV)) * CAMERA_Z
    const halfWidth = halfHeight * camera.aspect
    const narrow = camera.aspect < 0.9

    // El mate, con el parallax del puntero, un vaivén lento y una flotación leve.
    const [, , mateScale, mateRotateX, mateRotateY, mateRotateZ] = state.mate
    const matePlacement: MatePlacement = narrow
      ? [0, -0.38, mateScale, mateRotateX, mateRotateY, mateRotateZ]
      : state.mate
    place(mateRoot, matePlacement, halfWidth, halfHeight, narrow)
    mateRoot.rotation.x += degrees(pointerY * 6)
    mateRoot.rotation.y += degrees(pointerX * 16 + Math.sin(t * 0.6) * 6)
    mateRoot.position.y += Math.sin(t * 1.1) * 0.02
    mateRoot.updateMatrixWorld(true)

    // La yerba: el disco sube con el llenado, la montañita crece y la mancha húmeda aparece.
    const fill = clamp01(state.fill)
    yerbaDisc.visible = fill > 0.01
    yerbaDisc.position.y = lerp(0.6, 0.985, fill)
    mound.visible = state.mound > 0.02
    mound.position.set(0.07, yerbaDisc.position.y - 0.005, -0.02)
    mound.scale.set(0.95, Math.max(0.001, state.mound * 0.42), 0.95)
    wetMaterial.opacity = clamp01(state.wet) * 0.85
    wet.position.set(-0.15, yerbaDisc.position.y + 0.004 + state.mound * 0.02, 0.06)
    wet.visible = state.wet > 0.02

    // La bombilla: suelta en su lugar o calzada en la yerba; a mitad de camino se desvanece.
    place(dummy, state.bombilla, halfWidth, halfHeight, narrow)
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

    // El paquete, con un balanceo leve.
    place(pack, state.pack, halfWidth, halfHeight, narrow)
    pack.rotation.y += Math.sin(t * 0.5) * 0.08
    pack.updateMatrixWorld(true)

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

    // La sombra bajo el mate.
    mateRoot.localToWorld(to.set(0, -0.58, 0))
    shadow.position.set(to.x, to.y - 0.02, -0.4)
    shadow.scale.setScalar(mateRoot.scale.x)

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
      disposeTree(scene)
      for (const texture of textures) texture.dispose()
      environment.dispose()
      renderer.dispose()
    },
  }
}

/** Libera las geometrías y los materiales de un árbol de objetos. */
function disposeTree(root: Three.Object3D): void {
  root.traverse((object) => {
    if (!('geometry' in object) || !('material' in object)) return
    const { geometry, material } = object as Three.Mesh
    geometry.dispose()
    for (const item of Array.isArray(material) ? material : [material]) item.dispose()
  })
}

/**
 * La caja del paquete con las aristas redondeadas y las caras apenas infladas, como un paquete de
 * papel lleno: cada vértice de una caja subdividida se lleva a una caja redondeada de radio
 * `PACK.radius` y se empuja hacia afuera en el centro de las caras.
 */
function roundedPack(T: typeof Three): Three.BoxGeometry {
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
