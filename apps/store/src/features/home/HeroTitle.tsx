import type { ReactNode } from 'react'
import { Fragment } from 'react'
import { cx } from '../../components/ui/cx'

/** Retardo de entrada de cada parte del título, en milisegundos (los 60 y 180 del diseño). */
const TITLE_PART_DELAYS_MS = [60, 180] as const

/** Props de {@link HeroTitleRow}. */
export interface HeroTitleRowProps {
  /** Las partes del título (`hero.titleLines`): van en el mismo renglón, separadas por un espacio. */
  lines: readonly string[]
  /** `true` si el título ya entró en la página: se dibuja quieto, sin su animación de entrada. */
  entered?: boolean
}

/**
 * El renglón del título de la portada (Ruling AI-4): "Encontrá tu mate." en una sola línea. Cada
 * parte sube desde su máscara con CSS (sin esperar a JavaScript) y de la segunda en adelante van
 * con el degradé cobre. El `h1` que lo lleva pone el tamaño (que tiene que entrar en su columna) y
 * `whitespace-nowrap`, así el renglón nunca se corta.
 *
 * @param props - Ver {@link HeroTitleRowProps}.
 */
export function HeroTitleRow({ lines, entered = false }: HeroTitleRowProps): ReactNode {
  return (
    <span data-title-line="" className="block">
      {lines.map((line, position) => (
        <Fragment key={`${String(position)}-${line}`}>
          {position > 0 ? ' ' : null}
          <span className="inline-block overflow-hidden pb-[0.1em] align-bottom">
            <span
              className={cx(
                entered ? 'block' : 'home-rise block',
                position > 0 &&
                  'from-accent-300 to-accent-2-300 bg-linear-to-r bg-clip-text text-transparent [text-shadow:none]',
              )}
              style={
                entered
                  ? undefined
                  : { animationDelay: `${String(TITLE_PART_DELAYS_MS[position] ?? 180)}ms` }
              }
            >
              {line}
            </span>
          </span>
        </Fragment>
      ))}
    </span>
  )
}
