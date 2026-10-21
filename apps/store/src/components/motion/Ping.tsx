'use client'

import type { CSSProperties, ReactNode } from 'react'
import { m } from 'motion/react'
import { MotionFeatures } from './MotionFeatures'
import { usePrefersReducedMotion } from './use-prefers-reduced-motion'
import { assertNonNegative } from './validate'

/** Cuánto crece el halo: de 8 px a 28 px de diámetro, como la sombra de 10 px del diseño. */
const HALO_SCALE = 3.5

/** Props de {@link Ping}. */
export interface PingProps {
  /** Color del punto: cualquier color CSS. Por omisión el de acento. */
  color?: string
  /** Color del halo que late. Por omisión el de acento. */
  haloColor?: string
  /** Diámetro del punto, en píxeles. Por omisión 8. */
  size?: number
  /** Retardo del primer latido, en milisegundos; sirve para desfasar varios puntos. */
  delay?: number
  /** Clase del contenedor. */
  className?: string
}

/**
 * Punto que late: un halo del color del punto crece y se desvanece cada 1,8 segundos (indicador
 * de stock). El halo se anima con `transform` y `opacity`, en lugar de la sombra del diseño.
 *
 * Es decorativo (`aria-hidden`): el estado del stock tiene que decirse también con texto.
 * Con `prefers-reduced-motion: reduce` solo se ve el punto, sin halo.
 *
 * @param props - Ver {@link PingProps}.
 * @throws {RangeError} Si `size` o `delay` no son números mayores o iguales a 0.
 */
export function Ping({
  color = 'var(--color-accent)',
  haloColor = 'var(--color-accent)',
  size = 8,
  delay = 0,
  className,
}: PingProps): ReactNode {
  assertNonNegative('size', size)
  assertNonNegative('delay', delay)
  const reduced = usePrefersReducedMotion()
  const box: CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    width: size,
    height: size,
    flex: 'none',
  }
  const round: CSSProperties = { position: 'absolute', inset: 0, borderRadius: '50%' }
  return (
    <span aria-hidden="true" className={className} style={box}>
      {reduced ? null : (
        <MotionFeatures>
          <m.span
            style={{ ...round, background: haloColor }}
            initial={{ opacity: 0.6, scale: 1 }}
            animate={{ opacity: 0, scale: HALO_SCALE }}
            transition={{
              duration: 1.8,
              delay: delay / 1000,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </MotionFeatures>
      )}
      <span style={{ ...round, background: color }} />
    </span>
  )
}
