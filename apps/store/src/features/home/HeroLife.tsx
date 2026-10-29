'use client'

import type { ReactNode } from 'react'
import type { WorldPoint } from './world-media'
import { useMediaQuery } from '../../components/motion'
import { MateSteam } from './MateSteam'
import { YerbaLeaves } from './YerbaLeaves'

/** Desde qué ancho la portada se mueve: en celulares y tabletas, el cuadro queda quieto. */
const WIDE_QUERY = '(min-width: 1024px)'

/** Props de {@link HeroLife}. */
export interface HeroLifeProps {
  /** La boca del mate del poster de la portada, en fracciones del ancho y del alto de la portada. */
  mouth: WorldPoint
}

/**
 * Lo que se mueve sobre el poster de la portada (la "parada 0" del mundo del mate): las hojas de
 * yerba que caen hacia la boca del mate y el vapor que sube de ella. Solo desde 1024 px de ancho,
 * después de hidratar; con `prefers-reduced-motion` no se monta nada (lo resuelve cada capa).
 *
 * @param props - Ver {@link HeroLifeProps}.
 */
export function HeroLife({ mouth }: HeroLifeProps): ReactNode {
  const wide = useMediaQuery(WIDE_QUERY)
  if (!wide) return null
  return (
    <>
      <YerbaLeaves target={mouth} />
      <MateSteam origin={mouth} />
    </>
  )
}
