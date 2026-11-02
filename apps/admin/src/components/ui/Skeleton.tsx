import type { ReactNode } from 'react'
import { cx } from './cx'

/** Props de {@link Skeleton}. */
export interface SkeletonProps {
  /** Medidas y forma del bloque (por ejemplo `h-4 w-32` o `aspect-4/5 w-full rounded-lg`). */
  className?: string
}

/**
 * Bloque gris (`neutral-900`) que late mientras carga, con la forma del contenido que reemplaza.
 * Con `prefers-reduced-motion: reduce` no late.
 *
 * Es decorativo (`aria-hidden`): quien lo usa anuncia la carga, por ejemplo con `aria-busy` en
 * la tabla o la sección. Es un `<span>` en bloque, así entra también en un párrafo o una celda.
 *
 * @param props - Ver {@link SkeletonProps}.
 * @example
 * <Skeleton className="h-4 w-32" />
 */
export function Skeleton({ className }: SkeletonProps): ReactNode {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'block animate-pulse rounded-md bg-neutral-900 motion-reduce:animate-none',
        className,
      )}
    />
  )
}
