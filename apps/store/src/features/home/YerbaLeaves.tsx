'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { tokens } from '@galpon/design-tokens'
import type { WorldPoint } from './world-media'
import { usePrefersReducedMotion } from '../../components/motion'
import { cssPercent } from './world-media'

/** Silueta de una hoja de yerba de largo 1 sobre el eje x (de −0,5 a 0,5), con la punta a la derecha. */
const LEAF_PATH = 'M-0.5 0C-0.3-0.2 0.1-0.24 0.5 0C0.1 0.24-0.3 0.2-0.5 0Z'

/** Los dos tonos de oliva de las hojas. */
const LEAF_COLORS = [tokens.colors.accent2[600], tokens.colors.accent2[700]] as const

/** Cuántas hojas caen a la vez: pocas, para que sea elegante y no parezca nieve. */
const LEAF_COUNT = 16

/** Largo de las hojas, en px: de 10 a 22. */
const LEAF_SIZE = { min: 10, max: 22 } as const

/** Velocidad de caída, en px por segundo: despacio. */
const FALL_SPEED = { min: 16, max: 30 } as const

/** Ancho de la franja de donde salen las hojas, en fracciones del ancho de la capa (a cada lado de la boca). */
const SPREAD = 0.18

/** Ancho del lienzo, en fracciones del ancho de la capa: alcanza para la franja y el vaivén. */
const CANVAS_WIDTH = 0.5

/** Cuánto baja el lienzo por debajo de la boca, en fracciones del alto de la capa. */
const CANVAS_BELOW = 0.04

/** Paso máximo entre cuadros, en segundos: al volver de otra pestaña las hojas no saltan. */
const MAX_STEP = 0.05

/** El lienzo dibuja a lo sumo al doble de resolución: más no se nota en hojas tan chicas. */
const MAX_PIXEL_RATIO = 2

/** Una hoja que cae. */
interface Leaf {
  /** De dónde sale, en px desde el borde izquierdo del lienzo. */
  fromX: number
  /** Dónde nació, en px desde arriba del lienzo (arriba del borde). */
  fromY: number
  /** Altura actual, en px desde arriba del lienzo. */
  y: number
  /** Velocidad de caída, en px por segundo. */
  speed: number
  /** Largo, en px. */
  size: number
  /** Giro, en radianes. */
  angle: number
  /** Velocidad de giro, en radianes por segundo. */
  spin: number
  /** Vaivén de costado, en px. */
  sway: number
  /** Fase del vaivén y del volteo, en radianes. */
  phase: number
  /** Color de la hoja. */
  color: string
}

/** Un número al azar entre `min` y `max`. */
function between(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/** Una hoja nueva arriba del lienzo; al empezar, repartidas a distintas alturas para que no caigan juntas. */
function spawnLeaf(width: number, mouthY: number, scattered: boolean): Leaf {
  const size = between(LEAF_SIZE.min, LEAF_SIZE.max)
  const fromY = -size - between(0, 40)
  const spread = (SPREAD / CANVAS_WIDTH) * width
  return {
    fromX: width / 2 + between(-spread, spread),
    fromY,
    y: scattered ? between(fromY, mouthY) : fromY,
    speed: between(FALL_SPEED.min, FALL_SPEED.max),
    size,
    angle: between(0, Math.PI * 2),
    spin: between(-1.2, 1.2),
    sway: between(6, 20),
    phase: between(0, Math.PI * 2),
    color: LEAF_COLORS[Math.random() < 0.5 ? 0 : 1],
  }
}

/** Props de {@link YerbaLeaves}. */
export interface YerbaLeavesProps {
  /** Adonde caen las hojas: la boca del mate, en fracciones del ancho y del alto de la capa. */
  target: WorldPoint
}

/**
 * Hojas de yerba que caen despacio hacia la boca del mate y se desvanecen al llegar: un lienzo
 * decorativo (`aria-hidden`) sobre la capa, encima de la boca, con pocas hojas de 10 a 22 px en dos
 * tonos de oliva que giran, se voltean y se mecen. Se dibuja con `requestAnimationFrame` y se pausa
 * mientras la pestaña no se ve; lo monta solo la parada actual (o la portada). Con
 * `prefers-reduced-motion` no se monta.
 *
 * @param props - Ver {@link YerbaLeavesProps}.
 */
export function YerbaLeaves({ target }: YerbaLeavesProps): ReactNode {
  const reduced = usePrefersReducedMotion()
  const ref = useRef<HTMLCanvasElement>(null)
  const below = target.y / (target.y + CANVAS_BELOW)

  useEffect(() => {
    const canvas = ref.current
    const context = reduced || canvas === null ? null : canvas.getContext('2d')
    if (canvas === null || context === null) return
    const leafPath = new Path2D(LEAF_PATH)
    let width = 0
    let height = 0
    const resize = (): void => {
      // El tamaño de la caja sin transformar: la cámara la escala, pero el dibujo es el mismo.
      const ratio = Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }
    resize()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
    observer?.observe(canvas)
    // Las hojas nacen en el primer cuadro con medidas (antes el lienzo puede no tener tamaño).
    const leaves: Leaf[] = []

    let frame = 0
    let last: number | null = null
    const draw = (time: number): void => {
      const step = last === null ? 0 : Math.min(MAX_STEP, (time - last) / 1000)
      last = time
      const mouthX = width / 2
      const mouthY = height * below
      context.clearRect(0, 0, width, height)
      if (leaves.length === 0 && width > 0) {
        leaves.push(...Array.from({ length: LEAF_COUNT }, () => spawnLeaf(width, mouthY, true)))
      }
      for (const [position, leaf] of leaves.entries()) {
        leaf.y += leaf.speed * step
        leaf.angle += leaf.spin * step
        leaf.phase += step * 1.6
        // Cuánto le falta para llegar a la boca: se acerca a ella, se achica y se desvanece.
        const fall = Math.min(1, Math.max(0, (leaf.y - leaf.fromY) / (mouthY - leaf.fromY)))
        if (fall >= 1) {
          leaves[position] = spawnLeaf(width, mouthY, false)
          continue
        }
        const x =
          leaf.fromX +
          (mouthX - leaf.fromX) * fall * fall +
          Math.sin(leaf.phase) * leaf.sway * (1 - fall)
        const shown = Math.min(1, fall / 0.15) * Math.min(1, (1 - fall) / 0.45)
        const size = leaf.size * (1 - 0.4 * fall)
        context.save()
        context.translate(x, leaf.y)
        context.rotate(leaf.angle)
        context.scale(size, size * (0.35 + 0.65 * Math.abs(Math.cos(leaf.phase))))
        context.globalAlpha = 0.9 * shown
        context.fillStyle = leaf.color
        context.fill(leafPath)
        context.restore()
      }
      frame = requestAnimationFrame(draw)
    }
    const start = (): void => {
      if (frame !== 0 || document.hidden) return
      last = null
      frame = requestAnimationFrame(draw)
    }
    const stop = (): void => {
      cancelAnimationFrame(frame)
      frame = 0
    }
    const onVisibility = (): void => {
      if (document.hidden) stop()
      else start()
    }
    document.addEventListener('visibilitychange', onVisibility)
    start()
    return () => {
      stop()
      observer?.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reduced, below])

  if (reduced) return null
  const style: CSSProperties = {
    left: cssPercent(target.x - CANVAS_WIDTH / 2),
    width: cssPercent(CANVAS_WIDTH),
    height: cssPercent(target.y + CANVAS_BELOW),
  }
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      data-world-life="leaves"
      className="pointer-events-none absolute top-0"
      style={style}
    />
  )
}
