import type * as Three from 'three'
import type { Painter, SceneFrame, SceneShared, ThreeLib, YerbaModule } from './types'
import type { YerbaShape } from './yerba-shape'
import { disposeTree } from './dispose'
import { hollowCenter as findHollow, YERBA_RADIUS, yerbaHeight, yerbaShade } from './yerba-shape'

/** Anillos y radios de la malla polar de la superficie (48 × 96: 9120 triángulos). */
const RINGS = 48
const SPOKES = 96

/** Cambio mínimo de `fill`, `slope` o `wall` que vuelve a calcular el campo de alturas. */
const RESHAPE_EPSILON = 1e-4

/**
 * El material de la yerba: aspereza y relieve (la misma foto como `bumpMap`). El plan pedía un
 * `bumpScale` de 0,025, pero en three 0.186 el relieve se mide por píxel de pantalla y con 0,025 no
 * se ve; 1,5 se eligió mirando la escena (Task 1).
 */
const YERBA_ROUGHNESS = 0.92
const YERBA_BUMP_SCALE = 1.5

/**
 * Tinte que multiplica la foto: la baja y la lleva al verde oliva bajo la luz del estudio. Ajustes
 * vistos a 1440 × 900 con la GPU real: con `#c4caa0` se leía mostaza junto a la yerba de la foto
 * del fondo y con `#a9b28c` seguía apenas más amarilla; `#a4ab97` (menos saturado, misma luz)
 * queda oliva grisáceo, como `refs/yerba-crop.jpg`.
 */
const YERBA_TINT = '#a4ab97'

/**
 * La sombra pintada del hueco (`yerbaShade`), en el color lineal que multiplica la yerba: el piso
 * del hueco (`hollow 1`) queda a algo menos de la mitad de la luz de la meseta y un poco más gris,
 * y al pie de la pared (`occlusion 1`) baja otro 78 %: la banda oscura de
 * `refs/yerba-vista-arriba.webp`.
 */
const HOLLOW_SHADE = [0.42, 0.45, 0.44] as const
const FOOT_SHADE = 0.78

/** La yerba mojada: color al que se mezcla y aspereza donde está mojada. */
const WET_COLOR = '#2a2e14'
const WET_ROUGHNESS = 0.35

/** Radio de la mancha húmeda: 0,05 con `wet 0` que crece 0,13 hasta `wet 1`. */
const WET_RADIUS = 0.05
const WET_GROWTH = 0.13

/** La mancha llega a su fuerza plena con `wet` 1 / 1,6 (antes del final del chorro). */
const WET_GAIN = 1.6

/** Hojas que caen (420 entre las dos texturas): hojitas verde oliva y palitos amarillos. */
const LEAF_COUNT = 300
const CHIP_COUNT = 120

/**
 * Medidas del plano de cada hojita. Ajuste de la Task 3: con 0,014 × 0,022 el chorro se veía como un
 * hilo de motas de 4 a 9 px; un 40 % más grandes se leen como hojas sueltas.
 */
const FLAKE_WIDTH = 0.02
const FLAKE_HEIGHT = 0.03

/** Ancho del chorro de hojas al salir del pico y cuánto se abre hasta la yerba (Task 3: 0,006 y 0,05). */
const STREAM_OPEN = 0.012
const STREAM_SPREAD = 0.07

/** Partículas de polvo a lo largo del chorro, su tamaño y su opacidad máxima. */
const DUST_COUNT = 160
const DUST_SIZE = 0.03
const DUST_OPACITY = 0.6

/** Por debajo de este `pour` no cae nada (hojas y polvo ocultos). */
const POUR_THRESHOLD = 0.02

/** El chorro aterriza sobre la yerba a esta fracción del radio, hacia el lado más bajo de la boca. */
const LANDING_SHARE = 0.35

/** Cuánto empuja la salida del pico al chorro en su dirección (la de la boca del paquete). */
const EXIT_PUSH = 0.05

/** Lo fijo de cada hojita o mota de polvo: su fase, su ritmo, su lugar en el chorro y su giro. */
interface Flake {
  /** Fase en el ciclo de caída, de 0 a 1. */
  readonly phase: number
  /** Ciclos de caída por segundo. */
  readonly rate: number
  /** Corrimiento lateral en el chorro, de −1 a 1 (`x` y `z`). */
  readonly spreadX: number
  readonly spreadZ: number
  /** Giro por segundo alrededor de `x` y de `y`, en radianes. */
  readonly spinX: number
  readonly spinY: number
  /** Giro de partida, en radianes. */
  readonly turn: number
  /** Escala del plano y cuánto se estira a lo largo. */
  readonly size: number
  readonly stretch: number
}

/** El azar con semilla de este módulo: no consume el de `materials` (no cambia otras texturas). */
function seeded(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 16807) % 2147483647
    return state / 2147483647
  }
}

/** Recorta un número entre 0 y 1. */
function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/** La parte fraccionaria (de 0 a 1) de un número. */
function fract(value: number): number {
  return value - Math.floor(value)
}

/** La curva `smoothstep` entre dos bordes: 0 antes de `edge0`, 1 después de `edge1`. */
function smoothstep(edge0: number, edge1: number, value: number): number {
  const share = clamp01((value - edge0) / (edge1 - edge0))
  return share * share * (3 - 2 * share)
}

/** Si la forma cambió lo suficiente desde la última vez que se calculó el campo de alturas. */
function reshaped(last: YerbaShape | null, next: YerbaShape): boolean {
  return (
    last === null ||
    Math.abs(last.fill - next.fill) > RESHAPE_EPSILON ||
    Math.abs(last.slope - next.slope) > RESHAPE_EPSILON ||
    Math.abs(last.wall - next.wall) > RESHAPE_EPSILON
  )
}

/** Reparte las hojitas o motas: fase, ritmo, lugar en el chorro, giro y tamaño de cada una. */
function scatter(
  count: number,
  random: () => number,
  stretch: readonly [number, number],
): readonly Flake[] {
  return Array.from({ length: count }, () => ({
    phase: random(),
    rate: 0.62 + random() * 0.3,
    spreadX: random() * 2 - 1,
    spreadZ: random() * 2 - 1,
    spinX: (random() * 2 - 1) * 9,
    spinY: (random() * 2 - 1) * 7,
    turn: random() * Math.PI * 2,
    size: 0.7 + random() * 0.65,
    stretch: stretch[0] + random() * (stretch[1] - stretch[0]),
  }))
}

/** Traza un contorno cerrado por esos puntos. */
function outline(
  g: CanvasRenderingContext2D,
  points: readonly (readonly [number, number])[],
): void {
  g.beginPath()
  for (const [index, [x, y]] of points.entries()) {
    if (index === 0) g.moveTo(x, y)
    else g.lineTo(x, y)
  }
  g.closePath()
}

/** Puntea grano claro y oscuro en lo que esté recortado (hoja o palito). */
function speckle(
  g: CanvasRenderingContext2D,
  width: number,
  height: number,
  random: () => number,
): void {
  for (let index = 0; index < 260; index++) {
    g.fillStyle = random() < 0.5 ? 'rgba(34,30,14,.2)' : 'rgba(228,216,166,.16)'
    g.fillRect(random() * width, random() * height, 1 + random() * 3, 1 + random() * 3)
  }
}

/**
 * Pinta una hojita de yerba: un trozo irregular de bordes rectos, verde oliva (los tonos de la foto
 * de Lucas), con la nervadura clara, el borde oscuro y grano; el resto, transparente.
 */
function paintLeaf(random: () => number): Painter {
  return (g, width, height) => {
    const corners = Array.from({ length: 7 }, (_, index) => {
      const angle = (index / 7) * Math.PI * 2 + (random() - 0.5) * 0.6
      const reach = 0.3 + random() * 0.16
      return [
        width / 2 + Math.cos(angle) * reach * width * 0.9,
        height / 2 + Math.sin(angle) * reach * height,
      ] as const
    })
    const gradient = g.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#8e8752')
    gradient.addColorStop(0.55, '#6f693d')
    gradient.addColorStop(1, '#55502d')
    outline(g, corners)
    g.fillStyle = gradient
    g.fill()
    g.save()
    g.clip()
    speckle(g, width, height, random)
    g.strokeStyle = 'rgba(206,196,138,.45)'
    g.lineWidth = 2.5
    g.beginPath()
    g.moveTo(width * 0.45, height * 0.14)
    g.quadraticCurveTo(width * 0.58, height * 0.5, width * 0.48, height * 0.86)
    g.stroke()
    g.restore()
    outline(g, corners)
    g.strokeStyle = 'rgba(46,42,20,.6)'
    g.lineWidth = 3
    g.stroke()
  }
}

/**
 * Pinta un palito o trozo de polvo grueso: una astilla alargada amarilla (los amarillos de la foto),
 * con vetas a lo largo, borde oscuro y grano; el resto, transparente.
 */
function paintChip(random: () => number): Painter {
  return (g, width, height) => {
    const corners = [
      [width * 0.4, height * 0.08],
      [width * 0.62, height * 0.12],
      [width * 0.66, height * 0.55],
      [width * 0.58, height * 0.92],
      [width * 0.38, height * 0.88],
      [width * 0.34, height * 0.4],
    ] as const
    const gradient = g.createLinearGradient(width * 0.3, 0, width * 0.7, height)
    gradient.addColorStop(0, '#c6b783')
    gradient.addColorStop(0.5, '#a49779')
    gradient.addColorStop(1, '#8a7c55')
    outline(g, corners)
    g.fillStyle = gradient
    g.fill()
    g.save()
    g.clip()
    speckle(g, width, height, random)
    g.strokeStyle = 'rgba(92,80,44,.35)'
    g.lineWidth = 1.5
    for (let index = 0; index < 6; index++) {
      const x = width * (0.38 + random() * 0.26)
      g.beginPath()
      g.moveTo(x, height * 0.06)
      g.lineTo(x + (random() - 0.5) * 8, height * 0.94)
      g.stroke()
    }
    g.restore()
    outline(g, corners)
    g.strokeStyle = 'rgba(70,60,30,.55)'
    g.lineWidth = 2.5
    g.stroke()
  }
}

/**
 * Crea la yerba. Adentro del mate, un campo de alturas: una malla polar (48 anillos × 96 radios) de
 * radio `interiorRadius` con las alturas de {@link yerbaHeight} (la meseta contra la pared
 * izquierda, la pared y el hueco derecho), con la foto real `yerba-albedo.jpg` como color y relieve
 * y la humedad pintada en el shader (`onBeforeCompile`): una mancha que oscurece hacia `#2a2e14` y
 * baja la aspereza a 0,35 alrededor del hueco, con radio `0,05 + wet · 0,13`. También pinta la
 * sombra del hueco (`yerbaShade`, un atributo por vértice): el piso más oscuro que la meseta y una
 * banda oscura al pie de la pared. El campo y la sombra se recalculan solo cuando cambian `fill`,
 * `slope` o `wall`.
 *
 * Afuera, mientras `pour > 0,02`, las hojas que caen: 420 hojitas y palitos (dos `InstancedMesh`
 * con texturas pintadas) y 160 motas de polvo (`Points`) que salen del pico del paquete
 * (`shared.pack.spout`) y siguen una parábola hasta la yerba, del lado más bajo de la boca
 * inclinada, en un ciclo continuo. Todo sale del estado y de `t`: ir y volver con el scroll arma y
 * desarma igual.
 *
 * @param T - La biblioteca `three` que cargó `scene.ts`.
 * @param parent - Donde van las hojas y el polvo que caen (la escena); la superficie va en
 *   `shared.mate.mate`.
 * @param shared - Los materiales (la foto de la yerba y los pintores), el mate y el paquete.
 * @returns El módulo, con `hollowCenter` ({@link YerbaModule}).
 */
export function createYerba(
  T: ThreeLib,
  parent: Three.Object3D,
  shared: Pick<SceneShared, 'materials' | 'mate' | 'pack'>,
): YerbaModule {
  const { yerbaAlbedo, paint, radial } = shared.materials
  const { spout } = shared.pack
  const radius = Math.min(shared.mate.interiorRadius, YERBA_RADIUS)
  const random = seeded(29)

  // La superficie: malla polar con un vértice al centro y RINGS anillos de SPOKES vértices.
  const vertexCount = 1 + RINGS * SPOKES
  const geometry = new T.BufferGeometry()
  const positions = new T.BufferAttribute(new Float32Array(vertexCount * 3), 3)
  const uvs = new T.BufferAttribute(new Float32Array(vertexCount * 2), 2)
  // Cuánto se oscurece cada vértice: x el piso del hueco, y la sombra de la pared (`yerbaShade`).
  const shades = new T.BufferAttribute(new Float32Array(vertexCount * 2), 2)
  positions.setUsage(T.DynamicDrawUsage)
  uvs.setUsage(T.DynamicDrawUsage)
  shades.setUsage(T.DynamicDrawUsage)
  geometry.setAttribute('position', positions)
  geometry.setAttribute('uv', uvs)
  geometry.setAttribute('yerbaShade', shades)
  const vertex = (ring: number, spoke: number): number => 1 + (ring - 1) * SPOKES + (spoke % SPOKES)
  const indices: number[] = []
  for (let spoke = 0; spoke < SPOKES; spoke++)
    indices.push(0, vertex(1, spoke + 1), vertex(1, spoke))
  for (let ring = 1; ring < RINGS; ring++) {
    for (let spoke = 0; spoke < SPOKES; spoke++) {
      const a = vertex(ring, spoke)
      const b = vertex(ring, spoke + 1)
      const c = vertex(ring + 1, spoke)
      const d = vertex(ring + 1, spoke + 1)
      indices.push(a, b, c, b, d, c)
    }
  }
  geometry.setIndex(indices)

  // El material: la foto real como color y como relieve, y la humedad en el shader.
  const wetUniforms = {
    uWetCenter: { value: new T.Vector2() },
    uWetRadius: { value: WET_RADIUS },
    uWet: { value: 0 },
    uWetColor: { value: new T.Color(WET_COLOR) },
    uWetRoughness: { value: WET_ROUGHNESS },
    uHollowShade: { value: new T.Vector3(...HOLLOW_SHADE) },
    uFootShade: { value: FOOT_SHADE },
  }
  const material = new T.MeshStandardMaterial({
    name: 'yerba-campo',
    color: YERBA_TINT,
    map: yerbaAlbedo,
    bumpMap: yerbaAlbedo,
    bumpScale: YERBA_BUMP_SCALE,
    roughness: YERBA_ROUGHNESS,
    metalness: 0,
  })
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, wetUniforms)
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute vec2 yerbaShade;\nvarying vec2 vYerbaLocal;\nvarying vec2 vYerbaShade;',
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvYerbaLocal = position.xz;\nvYerbaShade = yerbaShade;',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        [
          '#include <common>',
          'varying vec2 vYerbaLocal;',
          'varying vec2 vYerbaShade;',
          'uniform vec3 uHollowShade;',
          'uniform float uFootShade;',
          'uniform vec2 uWetCenter;',
          'uniform float uWetRadius;',
          'uniform float uWet;',
          'uniform vec3 uWetColor;',
          'uniform float uWetRoughness;',
        ].join('\n'),
      )
      .replace(
        '#include <map_fragment>',
        [
          '#include <map_fragment>',
          // El piso del hueco, más oscuro que la meseta, y la banda oscura al pie de la pared.
          'diffuseColor.rgb *= mix(vec3(1.0), uHollowShade, vYerbaShade.x);',
          'diffuseColor.rgb *= 1.0 - uFootShade * vYerbaShade.y;',
          // El borde de la mancha ondula un poco: el agua no moja en un círculo perfecto.
          'float yerbaWobble = sin(vYerbaLocal.x * 61.0 + sin(vYerbaLocal.y * 47.0) * 2.0) * sin(vYerbaLocal.y * 53.0 + 1.7);',
          'float yerbaDistance = distance(vYerbaLocal, uWetCenter) + yerbaWobble * 0.012;',
          'float yerbaWet = uWet * (1.0 - smoothstep(uWetRadius * 0.45, uWetRadius, yerbaDistance));',
          'diffuseColor.rgb = mix(diffuseColor.rgb, mix(uWetColor, diffuseColor.rgb * 0.5, 0.45), yerbaWet);',
        ].join('\n'),
      )
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, uWetRoughness, yerbaWet);',
      )
  }
  material.customProgramCacheKey = () => 'galpon-yerba-humeda-sombra'
  const surface = new T.Mesh(geometry, material)
  surface.visible = false
  shared.mate.mate.add(surface)

  const hollow = new T.Vector3()
  let lastShape: YerbaShape | null = null
  const reshape = (shape: YerbaShape): void => {
    let index = 0
    const write = (x: number, z: number): void => {
      const y = yerbaHeight(x, z, shape)
      positions.setXYZ(index, x, y, z)
      // Las coordenadas de textura siguen el largo de la superficie: la pared no estira la foto.
      uvs.setXY(index, (x - y) / (2 * radius), z / (2 * radius))
      const { hollow: low, occlusion } = yerbaShade(x, z, shape)
      shades.setXY(index, low, occlusion)
      index++
    }
    write(0, 0)
    for (let ring = 1; ring <= RINGS; ring++) {
      const ringRadius = (radius * ring) / RINGS
      for (let spoke = 0; spoke < SPOKES; spoke++) {
        const angle = (spoke / SPOKES) * Math.PI * 2
        write(ringRadius * Math.cos(angle), ringRadius * Math.sin(angle))
      }
    }
    positions.needsUpdate = true
    uvs.needsUpdate = true
    shades.needsUpdate = true
    geometry.computeVertexNormals()
    geometry.computeBoundingSphere()
    const center = findHollow(shape)
    hollow.set(center.x, center.y, center.z)
    wetUniforms.uWetCenter.value.set(center.x, center.z)
    lastShape = shape
  }
  reshape({ fill: 0, slope: 0, wall: 0 })

  // Las hojas que caen: hojitas verde oliva y palitos amarillos, con un matiz por instancia.
  const flakeGeometry = new T.PlaneGeometry(FLAKE_WIDTH, FLAKE_HEIGHT)
  const flakeMesh = (
    painter: Painter,
    count: number,
    tint: (color: Three.Color) => void,
  ): Three.InstancedMesh => {
    const mesh = new T.InstancedMesh(
      flakeGeometry,
      new T.MeshStandardMaterial({
        map: paint(128, 128, painter),
        alphaTest: 0.5,
        side: T.DoubleSide,
        roughness: 0.85,
        metalness: 0,
      }),
      count,
    )
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage)
    mesh.frustumCulled = false
    mesh.visible = false
    const color = new T.Color()
    for (let index = 0; index < count; index++) {
      tint(color)
      mesh.setColorAt(index, color)
    }
    if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true
    parent.add(mesh)
    return mesh
  }
  const leaves = flakeMesh(paintLeaf(random), LEAF_COUNT, (color) => {
    const light = 0.76 + random() * 0.36
    const ripe = random() * 0.5
    color.setRGB(light * (1 + ripe * 0.1), light * (1 + ripe * 0.04), light * (1 - ripe * 0.2))
  })
  const chips = flakeMesh(paintChip(random), CHIP_COUNT, (color) => {
    color.setScalar(0.85 + random() * 0.3)
  })
  const leafFlakes = scatter(LEAF_COUNT, random, [0.8, 1.25])
  const chipFlakes = scatter(CHIP_COUNT, random, [1.3, 1.9])

  // El polvo: motas blandas a lo largo del chorro, más lentas y más abiertas que las hojas.
  const dustGeometry = new T.BufferGeometry()
  const dustPositions = new T.BufferAttribute(new Float32Array(DUST_COUNT * 3), 3)
  dustPositions.setUsage(T.DynamicDrawUsage)
  dustGeometry.setAttribute('position', dustPositions)
  const dustMaterial = new T.PointsMaterial({
    map: radial([
      [0, 'rgba(196,182,140,.9)'],
      [0.45, 'rgba(164,151,121,.4)'],
      [1, 'rgba(164,151,121,0)'],
    ]),
    size: DUST_SIZE,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  })
  const dust = new T.Points(dustGeometry, dustMaterial)
  dust.frustumCulled = false
  dust.visible = false
  parent.add(dust)
  const motes = scatter(DUST_COUNT, random, [1, 1])

  const start = new T.Vector3()
  const end = new T.Vector3()
  const exit = new T.Vector3()
  const axisX = new T.Vector3()
  const axisZ = new T.Vector3()
  const point = new T.Vector3()
  const dummy = new T.Object3D()

  /** Dónde aterriza el chorro: sobre la yerba, hacia el punto más bajo de la boca (en mundo). */
  const landing = (mate: Three.Object3D, shape: YerbaShape): void => {
    axisX.set(1, 0, 0).transformDirection(mate.matrixWorld)
    axisZ.set(0, 0, 1).transformDirection(mate.matrixWorld)
    const tilt = Math.hypot(axisX.y, axisZ.y)
    const reach = tilt > 1e-6 ? (radius * LANDING_SHARE) / tilt : 0
    const x = -axisX.y * reach
    const z = -axisZ.y * reach
    mate.localToWorld(end.set(x, yerbaHeight(x, z, shape) + 0.01, z))
  }

  /** El punto `u` (0 en el pico, 1 en la yerba) de la parábola del chorro, con el corrimiento. */
  const along = (u: number, flake: Flake, spread: number, scale: number): Three.Vector3 => {
    point.lerpVectors(start, end, u)
    point.y = start.y + (end.y - start.y) * (0.35 * u + 0.65 * u * u)
    point.addScaledVector(exit, EXIT_PUSH * scale * 4 * u * (1 - u))
    const open = (STREAM_OPEN + spread * u) * scale
    point.x += flake.spreadX * open
    point.z += flake.spreadZ * open
    return point
  }

  /** Coloca las hojitas visibles de una malla para este cuadro. */
  const fall = (
    mesh: Three.InstancedMesh,
    flakes: readonly Flake[],
    share: number,
    t: number,
    scale: number,
  ): void => {
    const count = Math.ceil(flakes.length * share)
    mesh.count = count
    for (const [index, flake] of flakes.entries()) {
      if (index >= count) break
      const u = fract(t * flake.rate + flake.phase)
      dummy.position.copy(along(u, flake, STREAM_SPREAD, scale))
      dummy.position.x += Math.sin(t * 7 + flake.turn) * 0.004 * u * scale
      const fade = Math.max(1e-4, smoothstep(0, 0.06, u) * (1 - smoothstep(0.86, 1, u)))
      dummy.rotation.set(flake.turn + t * flake.spinX, flake.turn * 2 + t * flake.spinY, flake.turn)
      dummy.scale.set(flake.size * scale * fade, flake.size * flake.stretch * scale * fade, 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }

  /** Las hojas y el polvo que caen del pico mientras el paquete vuelca. */
  const pourYerba = ({ state, t, mateRoot, mate }: SceneFrame, shape: YerbaShape): void => {
    const pouring = state.pour > POUR_THRESHOLD
    leaves.visible = pouring
    chips.visible = pouring
    dust.visible = pouring
    if (!pouring) return
    const scale = mateRoot.scale.x
    const share = smoothstep(POUR_THRESHOLD, 0.6, clamp01(state.pour))
    spout.getWorldPosition(start)
    exit.set(0, 1, 0).transformDirection(spout.matrixWorld)
    landing(mate, shape)
    fall(leaves, leafFlakes, share, t, scale)
    fall(chips, chipFlakes, share, t, scale)
    const count = Math.ceil(DUST_COUNT * share)
    for (const [index, mote] of motes.entries()) {
      if (index >= count) break
      const u = fract(t * mote.rate * 0.6 + mote.phase)
      const at = along(u, mote, 0.14, scale)
      dustPositions.setXYZ(index, at.x, at.y + 0.03 * u * scale, at.z)
    }
    dustPositions.needsUpdate = true
    dustGeometry.setDrawRange(0, count)
    dustMaterial.size = DUST_SIZE * scale
    dustMaterial.opacity = DUST_OPACITY * share
  }

  return {
    hollowCenter: hollow,
    update: (frame) => {
      const { state } = frame
      const shape: YerbaShape = {
        fill: clamp01(state.fill),
        slope: clamp01(state.slope),
        wall: clamp01(state.wall),
      }
      if (reshaped(lastShape, shape)) reshape(shape)
      surface.visible = shape.fill > 0.01
      const wet = clamp01(state.wet)
      wetUniforms.uWet.value = Math.min(1, wet * WET_GAIN)
      wetUniforms.uWetRadius.value = WET_RADIUS + wet * WET_GROWTH
      pourYerba(frame, shape)
    },
    dispose: () => {
      for (const object of [surface, leaves, chips, dust]) {
        disposeTree(object)
        object.removeFromParent()
      }
    },
  }
}
