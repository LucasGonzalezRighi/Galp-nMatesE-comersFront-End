'use client'

import type { MotionValue } from 'motion/react'
import type { ReactNode } from 'react'
import { useMotionValueEvent } from 'motion/react'
import { useEffect, useRef } from 'react'
import type { MateSceneApi } from './scene'
import { mateStateAt } from './keyframes'
import { createMateScene } from './scene'
import { supportsWebGL } from './webgl-support'

/** Props de {@link MateCanvas}. */
export interface MateCanvasProps {
  /** Avance del recorrido, de 0 a 1: el `progress` del `ScrollStage`. */
  progress: MotionValue<number>
  /**
   * Se llama una vez si no hay WebGL o la escena no se pudo crear: quien lo usa muestra la foto del
   * mate en su lugar.
   */
  onUnavailable: () => void
  /** Clase extra del lienzo. */
  className?: string
}

/** Recorta un número entre `min` y `max`. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** El estado de la escena para un avance que puede pasarse apenas de 0 a 1 (el rebote del scroll). */
function stateFor(progress: number): ReturnType<typeof mateStateAt> {
  return mateStateAt(clamp(progress, 0, 1))
}

/**
 * El lienzo del mate 3D: decorativo (`aria-hidden`), llena su contenedor y crea la escena
 * ({@link createMateScene}) recién cuando entra en pantalla, así three no se descarga antes. Le pasa
 * el estado del avance ({@link mateStateAt}) en cada cambio, el puntero (solo el del mouse, de −1 a 1
 * sobre la ventana) y la visibilidad: fuera de pantalla o con la pestaña oculta la escena no dibuja.
 * Si no hay WebGL o la escena no se puede crear llama a `onUnavailable`. No mira
 * `prefers-reduced-motion`: con menos movimiento no se monta.
 *
 * @param props - Ver {@link MateCanvasProps}.
 */
export function MateCanvas({ progress, onUnavailable, className }: MateCanvasProps): ReactNode {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<MateSceneApi | null>(null)
  const unavailableRef = useRef(onUnavailable)

  useEffect(() => {
    unavailableRef.current = onUnavailable
  }, [onUnavailable])

  useMotionValueEvent(progress, 'change', (value) => {
    sceneRef.current?.setState(stateFor(value))
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas === null) return
    if (!supportsWebGL(document.createElement('canvas'))) {
      unavailableRef.current()
      return
    }
    let scene: MateSceneApi | null = null
    let loading = false
    let disposed = false
    // Sin `IntersectionObserver` se asume a la vista; con él, el primer aviso del navegador decide.
    let onScreen = typeof IntersectionObserver === 'undefined'

    const syncVisibility = (): void => {
      scene?.setVisible(onScreen && !document.hidden)
    }
    const load = (): void => {
      if (loading) return
      loading = true
      createMateScene(canvas).then(
        (created) => {
          if (disposed) {
            created.dispose()
            return
          }
          scene = created
          sceneRef.current = created
          created.setState(stateFor(progress.get()))
          syncVisibility()
        },
        () => {
          if (!disposed) unavailableRef.current()
        },
      )
    }
    const onVisibility = (): void => {
      syncVisibility()
    }
    const onPointer = (event: PointerEvent): void => {
      if (event.pointerType !== 'mouse') return
      scene?.setPointer(
        clamp((event.clientX / window.innerWidth) * 2 - 1, -1, 1),
        clamp((event.clientY / window.innerHeight) * 2 - 1, -1, 1),
      )
    }

    const intersection = onScreen
      ? null
      : new IntersectionObserver((entries) => {
          onScreen = entries.at(-1)?.isIntersecting ?? onScreen
          if (onScreen) load()
          syncVisibility()
        })
    intersection?.observe(canvas)
    if (onScreen) load()
    const resize =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            scene?.resize()
          })
    resize?.observe(canvas)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pointermove', onPointer, { passive: true })

    return () => {
      disposed = true
      intersection?.disconnect()
      resize?.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pointermove', onPointer)
      scene?.dispose()
      sceneRef.current = null
    }
  }, [progress])

  const base = 'pointer-events-none absolute inset-0 size-full'
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className === undefined ? base : `${base} ${className}`}
    />
  )
}
