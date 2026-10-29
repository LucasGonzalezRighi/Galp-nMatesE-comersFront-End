'use client'

import type { CSSProperties, ReactNode } from 'react'
import type { WorldPoint } from './world-media'
import { usePrefersReducedMotion } from '../../components/motion'
import { cssPercent } from './world-media'

/** Una mancha de vapor: cuándo sale (en ms, para que no suban juntas) y cuánto se corre de costado. */
interface SteamPuff {
  /** Retardo de su vuelta, en milisegundos. */
  delay: number
  /** Cuánto se corre de costado al subir (`--steam-sway`). */
  sway: string
}

/** Tres manchas que salen una detrás de otra, cada una hacia un lado. */
const PUFFS: readonly SteamPuff[] = [
  { delay: 0, sway: '-18px' },
  { delay: 3000, sway: '14px' },
  { delay: 6000, sway: '-4px' },
]

/** Props de {@link MateSteam}. */
export interface MateSteamProps {
  /** De donde sube el vapor: la boca del mate, en fracciones del ancho y del alto de la capa. */
  origin: WorldPoint
}

/**
 * Vapor que sube de la boca del mate: tres manchas difusas (`div` con desenfoque y opacidad baja)
 * que suben despacio desde la boca con `translate` y `scale`, se deshacen y vuelven a salir, una
 * detrás de otra (la animación `home-steam` de `home.css`). Decorativo (`aria-hidden`); lo monta
 * solo la parada actual (o la portada). Solo se animan `transform` y `opacity`. Con
 * `prefers-reduced-motion` no se monta.
 *
 * @param props - Ver {@link MateSteamProps}.
 */
export function MateSteam({ origin }: MateSteamProps): ReactNode {
  const reduced = usePrefersReducedMotion()
  if (reduced) return null
  return (
    <div
      aria-hidden="true"
      data-world-life="steam"
      className="pointer-events-none absolute"
      style={{ left: cssPercent(origin.x), top: cssPercent(origin.y) }}
    >
      {PUFFS.map((puff) => (
        <span
          key={puff.delay}
          className="home-steam"
          style={
            {
              animationDelay: `${String(puff.delay)}ms`,
              '--steam-sway': puff.sway,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
