import type * as Three from 'three'
import type { Painter, SceneModule, SceneShared, ThreeLib } from './types'
import { disposeTree } from './dispose'
import { place } from './place'
import { streamPoints } from './water-path'

/** Una vuelta entera, en radianes. */
const TAU = Math.PI * 2

/** Debajo de este valor una pieza del agua (chorro, salpicadura, charco, vapor) no se dibuja. */
const VISIBLE_FROM = 0.02

/** Anillos del chorro a lo largo, del pico al hueco. */
const STREAM_RINGS = 48

/** Lados de cada anillo del chorro. */
const STREAM_SIDES = 10

/** Puntos de la curva entera del chorro (`streamPoints`), de donde salen los anillos. */
const PATH_POINTS = 25

/** Radio del chorro al salir del pico y al llegar al hueco (se multiplica por la escala del mate). */
const STREAM_RADIUS = { top: 0.012, bottom: 0.007 } as const

/**
 * Dónde cae el chorro respecto del centro del hueco, en coordenadas de `mate`: apenas hacia el centro
 * del mate y hacia la cámara (al costado de la bombilla) y un poco adentro de la yerba, que lo tapa.
 */
const IMPACT_OFFSET = { x: -0.02, y: -0.02, z: 0.09 } as const

/** Gotas de la salpicadura. */
const DROP_COUNT = 28

/** Gravedad de las gotas, en unidades del mate por segundo al cuadrado. */
const DROP_GRAVITY = 6

/** Anillos de la salpicadura, desfasados medio ciclo. */
const RIPPLE_COUNT = 2

/** Radio del charco en el hueco, en coordenadas de `mate`. */
const PUDDLE_RADIUS = 0.14

/** Cuánto sobre la superficie del hueco queda el charco. */
const PUDDLE_LIFT = 0.004

/** Nubes de vapor. */
const STEAM_COUNT = 14

/** Recorta un número entre 0 y 1. */
function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/** Interpola entre dos números. */
function lerp(from: number, to: number, share: number): number {
  return from + (to - from) * share
}

/** Un azar fijo de 0 a 1 por pieza (`index`) y por uso (`salt`): cada gota y cada nube es distinta. */
function jitter(index: number, salt: number): number {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453
  return value - Math.floor(value)
}

/** Pinta el mapa de normales de las ondas del chorro: crestas a lo ancho que se repiten en mosaico. */
const paintWaves: Painter = (context, width, height) => {
  const image = context.createImageData(width, height)
  const heightAt = (x: number, y: number): number => {
    const u = x / width
    const v = y / height
    return (
      Math.sin(TAU * (3 * u + 0.12 * Math.sin(TAU * v))) + 0.35 * Math.sin(TAU * (7 * u + 2 * v))
    )
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const slopeX = (heightAt(x + 1, y) - heightAt(x - 1, y)) * 2.5
      const slopeY = (heightAt(x, y + 1) - heightAt(x, y - 1)) * 2.5
      const length = Math.hypot(slopeX, slopeY, 1)
      const offset = (y * width + x) * 4
      image.data[offset] = (-slopeX / length / 2 + 0.5) * 255
      image.data[offset + 1] = (-slopeY / length / 2 + 0.5) * 255
      image.data[offset + 2] = (1 / length / 2 + 0.5) * 255
      image.data[offset + 3] = 255
    }
  }
  context.putImageData(image, 0, 0)
}

/** Pinta el acero cepillado del termo: vetas finas a lo largo del cuerpo. */
const paintBrushedSteel: Painter = (context, width, height) => {
  for (let x = 0; x < width; x++) {
    const shade = 200 + Math.round(jitter(x, 3) * 45)
    context.fillStyle = `rgb(${String(shade)},${String(shade)},${String(Math.min(255, shade + 4))})`
    context.fillRect(x, 0, 1, height)
  }
}

/** Pinta una nube de vapor blanda: manchas superpuestas, ruido fino, huecos y el borde que se apaga. */
const paintSteamCloud: Painter = (context, width, height) => {
  const centerX = width / 2
  const centerY = height / 2
  const blob = (index: number, salt: number, alpha: number): void => {
    const angle = jitter(index, salt) * TAU
    const distance = jitter(index, salt + 1) * width * 0.22
    const x = centerX + Math.cos(angle) * distance
    const y = centerY + Math.sin(angle) * distance
    const radius = width * (0.12 + jitter(index, salt + 2) * 0.16)
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, `rgba(255,252,246,${String(alpha)})`)
    gradient.addColorStop(1, 'rgba(255,252,246,0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, width, height)
  }
  for (let index = 0; index < 24; index++) blob(index, 11, 0.14 + jitter(index, 14) * 0.14)
  for (let index = 0; index < 900; index++) {
    context.fillStyle = `rgba(255,255,255,${String(jitter(index, 15) * 0.07)})`
    context.fillRect(jitter(index, 16) * width, jitter(index, 17) * height, 2, 2)
  }
  // Huecos blandos: el vapor se ve en hebras y no como una bola pareja.
  context.globalCompositeOperation = 'destination-out'
  for (let index = 0; index < 9; index++) blob(index, 21, 0.35)
  // El borde se apaga del todo.
  context.globalCompositeOperation = 'destination-in'
  const mask = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, width / 2)
  mask.addColorStop(0, 'rgba(0,0,0,1)')
  mask.addColorStop(0.55, 'rgba(0,0,0,0.8)')
  mask.addColorStop(1, 'rgba(0,0,0,0)')
  context.fillStyle = mask
  context.fillRect(0, 0, width, height)
  context.globalCompositeOperation = 'source-over'
}

/**
 * Crea el agua de la parada 3: el pico del termo, el chorro, la salpicadura, el charco y el vapor.
 *
 * - **Termo** (`state.thermos`, colocado con `place`): el origen es la boca del pico y el eje `+y` sale
 *   por ella; el cuerpo de acero cepillado (radio 0,11, largo 0,7), la tapa negra y el pico cónico
 *   quedan detrás. Con el giro Z cerca de 145 la boca mira abajo a la izquierda y el cuerpo sigue
 *   arriba a la derecha, así que solo asoma la parte baja.
 * - **Chorro** (`state.water`): un tubo sobre `streamPoints` desde la boca del pico hasta el hueco
 *   (`shared.yerba.hollowCenter`, al costado de la bombilla), de radio 0,012 a 0,007, con transmisión
 *   e índice 1,33 y ondas que bajan con `t`. Crece desde el pico con `water` y solo se dibuja con
 *   `water > 0,02` (así el pase de transmisión no corre en las otras paradas).
 * - **Salpicadura** (`state.splash`, solo cuando el chorro llega): dos anillos que se abren y se apagan
 *   en ciclo y 28 gotas que saltan del impacto.
 * - **Charco** (`state.puddle`): un disco de radio 0,14 en el hueco, oscuro y casi espejado; crece con
 *   `puddle`.
 * - **Vapor** (`state.steam`): 14 nubes con ruido que suben con vaivén desde el hueco, de tamaños
 *   distintos y con pulsos.
 *
 * Todo sale del estado y de `t` (nada acumula tiempo) y escala con el mate. Las texturas se pintan con
 * `shared.materials.paint` y `radial`, así que las libera `materials.dispose()`.
 *
 * @param T - La biblioteca `three` que cargó `scene.ts`.
 * @param parent - Donde van el termo, el chorro, las gotas y el vapor (la escena); el charco y los
 * anillos van en `shared.mate.mate`.
 * @param shared - Los materiales y pintores, el mate (sus grupos) y la yerba (`hollowCenter`).
 * @returns El módulo ({@link SceneModule}).
 */
export function createWater(T: ThreeLib, parent: Three.Object3D, shared: SceneShared): SceneModule {
  const { paint, radial } = shared.materials
  const { mate } = shared.mate
  const { hollowCenter } = shared.yerba

  // El termo: la boca del pico en el origen, el cuerpo hacia −y.
  const steel = new T.MeshStandardMaterial({
    name: 'acero del termo',
    map: paint(256, 8, paintBrushedSteel),
    metalness: 1,
    roughness: 0.25,
  })
  const capMaterial = new T.MeshStandardMaterial({
    name: 'tapa del termo',
    color: '#151515',
    roughness: 0.55,
  })
  const thermos = new T.Group()
  const spout = new T.Mesh(new T.CylinderGeometry(0.026, 0.055, 0.13, 32, 1, true), steel)
  spout.position.y = -0.065
  const lip = new T.Mesh(new T.TorusGeometry(0.026, 0.005, 8, 32), steel)
  lip.rotation.x = Math.PI / 2
  const throat = new T.Mesh(
    new T.CircleGeometry(0.025, 24),
    new T.MeshStandardMaterial({ color: '#0c0c0c', roughness: 0.6 }),
  )
  throat.rotation.x = -Math.PI / 2
  throat.position.y = -0.014
  const cap = new T.Mesh(new T.CylinderGeometry(0.085, 0.1, 0.12, 40), capMaterial)
  cap.position.y = -0.19
  const collar = new T.Mesh(new T.CylinderGeometry(0.108, 0.108, 0.03, 48), steel)
  collar.position.y = -0.265
  const body = new T.Mesh(new T.CylinderGeometry(0.11, 0.11, 0.7, 48), steel)
  body.position.y = -0.63
  thermos.add(spout, lip, throat, cap, collar, body)
  parent.add(thermos)

  // El chorro: un tubo cuyos anillos se recalculan cada cuadro sobre la curva del pico al hueco.
  const waves = paint(128, 32, paintWaves, false)
  waves.repeat.set(4, 1)
  const streamGeometry = new T.TubeGeometry(
    new T.LineCurve3(new T.Vector3(0, 1, 0), new T.Vector3(0, 0, 0)),
    STREAM_RINGS,
    STREAM_RADIUS.top,
    STREAM_SIDES,
    false,
  )
  const stream = new T.Mesh(
    streamGeometry,
    new T.MeshPhysicalMaterial({
      name: 'agua',
      color: '#e9f3ff',
      roughness: 0.04,
      metalness: 0,
      transmission: 1,
      thickness: 0.04,
      ior: 1.33,
      transparent: true,
      normalMap: waves,
      normalScale: new T.Vector2(0.6, 0.6),
    }),
  )
  // Los vértices se mueven cada cuadro: sin recorte por la esfera de la geometría inicial.
  stream.frustumCulled = false
  stream.visible = false
  parent.add(stream)
  const streamPositions = streamGeometry.getAttribute('position')
  const streamNormals = streamGeometry.getAttribute('normal')
  const centers = new Float32Array((STREAM_RINGS + 1) * 3)

  // La salpicadura: anillos en el hueco (dentro del mate) y gotas en mundo.
  const ripples = Array.from({ length: RIPPLE_COUNT }, () => {
    const ripple = new T.Mesh(
      new T.TorusGeometry(1, 0.03, 6, 40),
      new T.MeshStandardMaterial({
        color: '#eef6ff',
        roughness: 0.1,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    )
    ripple.rotation.x = Math.PI / 2
    ripple.visible = false
    mate.add(ripple)
    return ripple
  })
  const dropMap = radial([
    [0, 'rgba(250,253,255,1)'],
    [0.35, 'rgba(225,238,250,.75)'],
    [1, 'rgba(225,238,250,0)'],
  ])
  const drops = Array.from({ length: DROP_COUNT }, (_, index) => {
    const drop = new T.Sprite(
      new T.SpriteMaterial({ map: dropMap, transparent: true, depthWrite: false, opacity: 0 }),
    )
    drop.visible = false
    parent.add(drop)
    const rise = 0.45 + jitter(index, 2) * 0.35
    const life = (2 * rise) / DROP_GRAVITY
    return {
      drop,
      angle: jitter(index, 1) * TAU,
      spread: 0.18 + jitter(index, 3) * 0.24,
      rise,
      life,
      period: life * (1.3 + jitter(index, 4) * 0.7),
      phase: jitter(index, 5),
      size: 0.007 + jitter(index, 6) * 0.007,
    }
  })

  // El charco: un disco oscuro y casi espejado con el borde blando, en el hueco.
  const puddle = new T.Mesh(
    new T.CircleGeometry(PUDDLE_RADIUS, 48),
    new T.MeshPhysicalMaterial({
      name: 'charco',
      color: '#1b1d0c',
      roughness: 0.03,
      metalness: 0,
      transparent: true,
      // Ajuste de la Task 3: con 0,85 y el borde duro desde el 70 % del radio se leía como un disco
      // oscuro pegado; más transparente y con el borde que se apaga desde el 35 %, se funde con la
      // yerba mojada de alrededor.
      opacity: 0.72,
      alphaMap: radial([
        [0, '#ffffff'],
        [0.35, '#ffffff'],
        [1, '#000000'],
      ]),
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  )
  puddle.rotation.x = -Math.PI / 2
  puddle.visible = false
  mate.add(puddle)

  // El vapor: nubes con ruido de tamaños, velocidades y opacidades distintas.
  const cloudMap = paint(128, 128, paintSteamCloud)
  const clouds = Array.from({ length: STEAM_COUNT }, (_, index) => {
    const cloud = new T.Sprite(
      new T.SpriteMaterial({ map: cloudMap, transparent: true, depthWrite: false, opacity: 0 }),
    )
    cloud.visible = false
    parent.add(cloud)
    return {
      cloud,
      speed: 0.16 + jitter(index, 31) * 0.1,
      offset: index / STEAM_COUNT + jitter(index, 32) * 0.05,
      size: 0.7 + jitter(index, 33) * 0.6,
      // Ajuste de la Task 3: de 0,35..0,6 a 0,5..0,8; sobre los fondos nítidos el vapor casi no se leía.
      strength: 0.5 + jitter(index, 34) * 0.3,
      spin: (jitter(index, 35) - 0.5) * 1.6,
      turn: jitter(index, 36) * TAU,
    }
  })

  const from = new T.Vector3()
  const to = new T.Vector3()
  const hollow = new T.Vector3()
  const tangent = new T.Vector3()
  const normal = new T.Vector3()
  const binormal = new T.Vector3()
  const side = new T.Vector3()
  const depth = new T.Vector3(0, 0, 1)

  /** Lleva los anillos del chorro sobre la curva, del pico hasta `reach` (0 a 1) del camino. */
  const shapeStream = (reach: number, scale: number): void => {
    const path = streamPoints(from, to, PATH_POINTS)
    for (let ring = 0; ring <= STREAM_RINGS; ring++) {
      const position = (reach * ring * (PATH_POINTS - 1)) / STREAM_RINGS
      const index = Math.min(PATH_POINTS - 2, Math.floor(position))
      const share = position - index
      const a = path[index] ?? from
      const b = path[index + 1] ?? to
      centers[ring * 3] = lerp(a.x, b.x, share)
      centers[ring * 3 + 1] = lerp(a.y, b.y, share)
      centers[ring * 3 + 2] = lerp(a.z, b.z, share)
    }
    for (let ring = 0; ring <= STREAM_RINGS; ring++) {
      const before = Math.max(0, ring - 1) * 3
      const after = Math.min(STREAM_RINGS, ring + 1) * 3
      tangent.set(
        (centers[after] ?? 0) - (centers[before] ?? 0),
        (centers[after + 1] ?? 0) - (centers[before + 1] ?? 0),
        (centers[after + 2] ?? 0) - (centers[before + 2] ?? 0),
      )
      if (tangent.lengthSq() < 1e-12) tangent.set(0, -1, 0)
      tangent.normalize()
      normal.crossVectors(tangent, depth)
      if (normal.lengthSq() < 1e-12) normal.set(1, 0, 0)
      normal.normalize()
      binormal.crossVectors(tangent, normal)
      const along = (reach * ring) / STREAM_RINGS
      // La punta que todavía cae se afina: no se ve el tubo abierto.
      const tip = ring === STREAM_RINGS && reach < 0.999 ? 0.4 : 1
      const radius = lerp(STREAM_RADIUS.top, STREAM_RADIUS.bottom, along) * scale * tip
      for (let corner = 0; corner <= STREAM_SIDES; corner++) {
        const angle = (corner / STREAM_SIDES) * TAU
        side
          .copy(normal)
          .multiplyScalar(-Math.cos(angle))
          .addScaledVector(binormal, Math.sin(angle))
        const vertex = ring * (STREAM_SIDES + 1) + corner
        streamNormals.setXYZ(vertex, side.x, side.y, side.z)
        streamPositions.setXYZ(
          vertex,
          (centers[ring * 3] ?? 0) + side.x * radius,
          (centers[ring * 3 + 1] ?? 0) + side.y * radius,
          (centers[ring * 3 + 2] ?? 0) + side.z * radius,
        )
      }
    }
    streamPositions.needsUpdate = true
    streamNormals.needsUpdate = true
  }

  return {
    update: (frame) => {
      const { state, t, mateRoot } = frame
      const scale = mateRoot.scale.x
      const water = clamp01(state.water)

      // El termo y la boca de su pico.
      place(thermos, state.thermos, frame)
      thermos.updateMatrixWorld(true)
      thermos.localToWorld(from.set(0, 0.004, 0))

      // Donde cae el chorro: al costado de la bombilla, en el hueco.
      to.set(
        hollowCenter.x + IMPACT_OFFSET.x,
        hollowCenter.y + IMPACT_OFFSET.y,
        hollowCenter.z + IMPACT_OFFSET.z,
      )
      mate.localToWorld(to)
      stream.visible = water > VISIBLE_FROM && from.y - to.y > 0.05
      if (stream.visible) {
        shapeStream(water, scale)
        waves.offset.x = -((t * 2.2) % 1)
      }

      // La salpicadura solo cuando el chorro llega al hueco.
      const splash = clamp01(state.splash) * clamp01((water - 0.85) / 0.15)
      const splashing = splash > VISIBLE_FROM
      ripples.forEach((ripple, index) => {
        ripple.visible = splashing
        if (!splashing) return
        const cycle = (t * 1.4 + index / RIPPLE_COUNT) % 1
        ripple.position.set(
          hollowCenter.x + IMPACT_OFFSET.x,
          hollowCenter.y + PUDDLE_LIFT * 1.5,
          hollowCenter.z + IMPACT_OFFSET.z,
        )
        ripple.scale.setScalar(0.012 + cycle * 0.075)
        ripple.material.opacity = splash * (1 - cycle) ** 1.5 * 0.55
      })
      mate.localToWorld(
        hollow.set(
          hollowCenter.x + IMPACT_OFFSET.x,
          hollowCenter.y + PUDDLE_LIFT,
          hollowCenter.z + IMPACT_OFFSET.z,
        ),
      )
      for (const { drop, angle, spread, rise, life, period, phase, size } of drops) {
        const age = (t + phase * period) % period
        drop.visible = splashing && age < life
        if (!drop.visible) continue
        const share = age / life
        drop.position.set(
          hollow.x + Math.cos(angle) * spread * age * scale,
          hollow.y + (rise * age - (DROP_GRAVITY * age * age) / 2) * scale,
          hollow.z + Math.sin(angle) * spread * age * scale,
        )
        drop.scale.setScalar(size * scale * (1 - 0.4 * share))
        drop.material.opacity = splash * (1 - share * share) * 0.85
      }

      // El charco en el hueco.
      const pool = clamp01(state.puddle)
      puddle.visible = pool > VISIBLE_FROM
      if (puddle.visible) {
        puddle.position.set(hollowCenter.x, hollowCenter.y + PUDDLE_LIFT, hollowCenter.z)
        puddle.scale.setScalar(pool)
      }

      // El vapor que sube del hueco.
      const steam = clamp01(state.steam)
      const steaming = steam > VISIBLE_FROM
      mate.localToWorld(hollow.copy(hollowCenter))
      clouds.forEach(({ cloud, speed, offset, size, strength, spin, turn }, index) => {
        cloud.visible = steaming
        if (!steaming) return
        const rise = (t * speed + offset) % 1
        const sway = Math.sin(t * 0.9 + index * 1.7) * 0.05 * (0.3 + rise)
        cloud.position.set(
          hollow.x + sway * scale,
          hollow.y + (0.04 + rise * 0.85) * scale,
          hollow.z + Math.cos(t * 0.7 + index) * 0.03 * rise * scale,
        )
        const width = (0.1 + rise * 0.42) * size * scale
        cloud.scale.set(width, width, 1)
        cloud.material.rotation = turn + rise * spin
        const pulse = 0.8 + 0.2 * Math.sin(t * 1.7 + index * 2.3)
        cloud.material.opacity = steam * strength * Math.sin(rise * Math.PI) * pulse
      })
    },
    dispose: () => {
      for (const object of [
        thermos,
        stream,
        puddle,
        ...ripples,
        ...drops.map(({ drop }) => drop),
        ...clouds.map(({ cloud }) => cloud),
      ]) {
        disposeTree(object)
        object.removeFromParent()
      }
    },
  }
}
