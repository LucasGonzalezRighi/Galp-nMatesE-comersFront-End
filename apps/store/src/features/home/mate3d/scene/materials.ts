import type * as Three from 'three'
import type { Painter, SceneMaterials, ThreeLib } from './types'

/** La foto real de la yerba de Lucas, en mosaico espejado de 1024². */
const YERBA_ALBEDO_URL = '/hero/3d/yerba-albedo.jpg'

/**
 * Cuántas veces se repite la foto de la yerba sobre la superficie. Ajuste de la Task 3: con 2,2 las
 * hojas quedaban de 2 o 3 px y la yerba se leía como fieltro (y el espejado dejaba rosetas); con 1,3
 * se ven las hojas sueltas, como en la foto.
 */
const YERBA_REPEAT = 1.3

/** Giro (radianes) y corrimiento de la foto de la yerba: sacan del medio los ejes del espejado. */
const YERBA_TURN = 0.5
const YERBA_SHIFT = [0.21, 0.37] as const

/**
 * Cuero negro del Imperial Premium: el `Negro` de `leathers3d` (#3a2016) más oscuro y menos
 * saturado, para que en la luz de estudio se lea negro y no marrón.
 */
const LEATHER_COLOR = '#1b1410'

/** Brillo cobre leve del cuero. */
const LEATHER_SHEEN = '#c08050'

/**
 * Crea los materiales y las texturas que comparten los módulos de la escena (cuero, alpaca, bronce,
 * la foto real de la yerba, el curado y la sombra) y los pintores con que los módulos hacen las
 * suyas. Todas las texturas quedan anotadas y se liberan con `dispose`.
 *
 * @param T - La biblioteca `three` que cargó `scene.ts`.
 * @returns Los materiales, las texturas y los pintores ({@link SceneMaterials}).
 * @throws {Error} Si el navegador no da un lienzo 2D para pintar las texturas.
 */
export function createMaterials(T: ThreeLib): SceneMaterials {
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
  // La yerba: la foto real en mosaico (antes era una textura pintada con puntos).
  const yerbaAlbedo = load(YERBA_ALBEDO_URL)
  yerbaAlbedo.wrapS = T.RepeatWrapping
  yerbaAlbedo.wrapT = T.RepeatWrapping
  yerbaAlbedo.repeat.set(YERBA_REPEAT, YERBA_REPEAT)
  // Ajuste de la Task 3: girada y corrida, los ejes del espejado quedan oblicuos y fuera del centro
  // de la boca, y las rosetas simétricas no se leen.
  yerbaAlbedo.center.set(0.5, 0.5)
  yerbaAlbedo.rotation = YERBA_TURN
  yerbaAlbedo.offset.set(YERBA_SHIFT[0], YERBA_SHIFT[1])
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
    // Ajuste de la Task 3: con 0,2 el caño de la bombilla, visto desde arriba, reflejaba el techo
    // oscuro del estudio y se leía negro; con 0,32 se lee plateado.
    roughness: 0.32,
  })
  const bronze = new T.MeshStandardMaterial({
    name: 'bronce',
    color: '#d4a64e',
    metalness: 1,
    roughness: 0.28,
  })

  return {
    leather,
    alpaca,
    smoothAlpaca,
    bronze,
    yerbaAlbedo,
    curedMap,
    shadowMap,
    random,
    paint,
    load,
    radial,
    dispose: () => {
      for (const material of [leather, alpaca, smoothAlpaca, bronze]) material.dispose()
      for (const texture of textures) texture.dispose()
    },
  }
}
