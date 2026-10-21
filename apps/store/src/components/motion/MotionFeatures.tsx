'use client'

import type { ReactNode } from 'react'
import { domAnimation, LazyMotion } from 'motion/react'

/** Props de {@link MotionFeatures}. */
interface MotionFeaturesProps {
  /** Los componentes `m` que necesitan las funciones de animación. */
  children: ReactNode
}

/**
 * Carga las funciones de animación de Motion (`domAnimation`) para los componentes `m` de adentro.
 * Cada componente de `components/motion` la usa por su cuenta, así funciona sin importar dónde se
 * lo monte (sin `strict`, para no romper a quien ponga adentro un componente de otra feature).
 *
 * @param props - Ver {@link MotionFeaturesProps}.
 */
export function MotionFeatures({ children }: MotionFeaturesProps): ReactNode {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>
}
