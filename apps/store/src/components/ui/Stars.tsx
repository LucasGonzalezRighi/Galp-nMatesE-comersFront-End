import type { ReactNode } from 'react'
import { formatRating } from '@galpon/domain'
import { cx } from './cx'
import { UI_COPY } from './ui.copy'

/** Props de {@link Stars}. */
export interface StarsProps {
  /** Puntuación de 0 a 5; admite decimales (se dibujan medias estrellas, ver {@link Stars}). */
  value: number
  /** Lado de cada estrella en píxeles. Por defecto 14. */
  size?: number
  /** Clases extra del contenedor. */
  className?: string
}

/** Silueta de la estrella (Phosphor, relleno), la misma que usa el diseño. */
const STAR_PATH =
  'M234.29,114.85l-45,38.83L203,211.75a16.4,16.4,0,0,1-24.5,17.82L128,198.49,77.47,229.57A16.4,16.4,0,0,1,53,211.75l13.76-58.07-45-38.83A16.46,16.46,0,0,1,31.08,86l59-4.76,22.76-55.08a16.36,16.36,0,0,1,30.27,0l22.75,55.08,59,4.76a16.46,16.46,0,0,1,9.37,28.86Z'

/** Posiciones de las cinco estrellas, de izquierda a derecha. */
const POSITIONS = [1, 2, 3, 4, 5] as const

/** Opacidad de la parte vacía de una estrella (la del diseño). */
const EMPTY_STAR_CLASS = 'opacity-[0.22]'

/** Recorte que deja ver solo la mitad izquierda de la estrella llena, la de una media estrella. */
const HALF_STAR_CLIP_CLASS = '[clip-path:inset(0_50%_0_0)]'

/** Cómo se dibuja una estrella: llena, a la mitad o vacía. */
type StarFill = 'full' | 'half' | 'empty'

/**
 * Regla del diseño: la estrella de esa posición se llena si la puntuación llega a `posición - 0,25`
 * y queda a la mitad si llega a `posición - 0,75`.
 */
function starFill(value: number, position: number): StarFill {
  if (value >= position - 0.25) return 'full'
  if (value >= position - 0.75) return 'half'
  return 'empty'
}

/** Dibuja una estrella de `size` píxeles. */
function StarIcon({ size, className }: { size: number; className?: string }): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="currentColor"
      aria-hidden="true"
      className={cx('block max-w-none', className)}
    >
      <path d={STAR_PATH} />
    </svg>
  )
}

/**
 * Puntuación en estrellas de solo lectura, con media estrella: la estrella `i` se llena si la
 * puntuación es de `i - 0,25` o más y queda a la mitad si es de `i - 0,75` o más (4,7 dibuja cuatro
 * llenas y una media; 4,2, cuatro llenas y una vacía). La media es la silueta vacía con una llena
 * encima recortada al 50 % del ancho. Se anuncia como una imagen con el texto exacto, por ejemplo
 * "4,5 de 5".
 *
 * @param props - Ver {@link StarsProps}.
 * @throws {RangeError} Si `value` no es un número entre 0 y 5, o `size` no es mayor a 0.
 * @example
 * <Stars value={averageRating(ratings)} />
 */
export function Stars({ value, size = 14, className }: StarsProps): ReactNode {
  // `formatRating` valida el rango y da el texto con coma decimal.
  const label = `${formatRating(value)} ${UI_COPY.outOfFive}`
  if (!Number.isFinite(size) || size <= 0) {
    throw new RangeError(
      `El tamaño de las estrellas tiene que ser mayor a 0; se recibió ${String(size)}.`,
    )
  }

  return (
    <span
      role="img"
      aria-label={label}
      className={cx('text-accent inline-flex', size < 15 ? 'gap-[2px]' : 'gap-[3px]', className)}
    >
      {POSITIONS.map((position) => {
        const fill = starFill(value, position)
        return (
          <span key={position} data-fill={fill} className="relative inline-flex">
            <StarIcon size={size} className={fill === 'full' ? undefined : EMPTY_STAR_CLASS} />
            {fill === 'half' ? (
              <StarIcon size={size} className={cx('absolute top-0 left-0', HALF_STAR_CLIP_CLASS)} />
            ) : null}
          </span>
        )
      })}
    </span>
  )
}
