'use client'

import type { CSSProperties, ReactNode, Ref } from 'react'
import { m, useAnimationControls } from 'motion/react'
import { useImperativeHandle } from 'react'
import { MotionFeatures } from './MotionFeatures'
import { usePrefersReducedMotion } from './use-prefers-reduced-motion'

/** Recorrido del temblor, en píxeles: de lado a lado, cada vez más chico. */
const SHAKE_X = [0, -10, 9, -7, 5, -2, 0]

/** Lo que expone {@link Shake} por su `ref`. */
export interface ShakeHandle {
  /** Hace temblar el contenido. Si ya está temblando, empieza de nuevo. */
  shake: () => void
}

/** Props de {@link Shake}. */
export interface ShakeProps {
  /** Referencia con la que quien lo usa llama a `shake()` (por ejemplo, al fallar la validación). */
  ref?: Ref<ShakeHandle>
  /** Clase del contenedor. */
  className?: string
  /** Estilo del contenedor. */
  style?: CSSProperties
  /** El campo (o grupo de campos) que tiembla. */
  children?: ReactNode
}

/**
 * Contenedor que tiembla de lado a lado (450 ms) cuando se llama a `shake()` por su `ref`. Es
 * para marcar un campo con error en los formularios; el error tiene que informarse además con
 * texto (`aria-invalid` y un mensaje), porque el temblor es solo un refuerzo.
 *
 * Con `prefers-reduced-motion: reduce`, `shake()` no hace nada.
 *
 * @param props - Ver {@link ShakeProps}.
 * @example
 * const shakeRef = useRef<ShakeHandle>(null)
 * // …al fallar la validación:
 * shakeRef.current?.shake()
 */
export function Shake({ ref, className, style, children }: ShakeProps): ReactNode {
  const reduced = usePrefersReducedMotion()
  const controls = useAnimationControls()
  useImperativeHandle(
    ref,
    () => ({
      shake: () => {
        if (reduced) return
        void controls.start({ x: SHAKE_X, transition: { duration: 0.45, ease: 'easeInOut' } })
      },
    }),
    [controls, reduced],
  )
  return (
    <MotionFeatures>
      <m.div className={className} style={style} animate={controls}>
        {children}
      </m.div>
    </MotionFeatures>
  )
}
