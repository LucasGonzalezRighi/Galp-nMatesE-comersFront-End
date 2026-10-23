import type { CSSProperties, ReactNode } from 'react'
import { cx } from '../ui/cx'

/** Props de {@link Wordmark}. */
export interface WordmarkProps {
  /** Clases del marco. Tiene que dar el ancho (el alto sale de la proporción del logo). */
  className?: string
  /** Estilo del marco, por ejemplo el `background` con que se pinta el logo. */
  style?: CSSProperties
  /** Dónde se apoya el logo dentro del marco: al centro (encabezado) o abajo (pie, recortado). */
  anchor?: 'center' | 'bottom'
}

/**
 * Logo "GALPÓN" como máscara: el marco se pinta con el `background` que se le pase (el color del
 * texto, o un degradé en el pie) y solo se ve donde el logo (`/brand/galpon-wordmark.png`) es
 * opaco. Tiene la proporción del archivo (1447 por 279). Es decorativo: quien lo usa le pone el
 * nombre accesible (por ejemplo, en el link al inicio).
 *
 * @param props - Ver {@link WordmarkProps}.
 */
export function Wordmark({ className, style, anchor = 'center' }: WordmarkProps): ReactNode {
  const mask = `url(/brand/galpon-wordmark.png) center ${anchor === 'bottom' ? 'bottom' : 'center'} / contain no-repeat`
  return (
    <span
      aria-hidden="true"
      className={cx('block aspect-[1447/279]', className)}
      style={{ WebkitMask: mask, mask, ...style }}
    />
  )
}
