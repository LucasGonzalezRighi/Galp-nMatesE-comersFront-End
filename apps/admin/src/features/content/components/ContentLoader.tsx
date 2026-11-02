import type { ReactNode } from 'react'
import type { ContentLoadState } from '../content-load-state'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Skeleton } from '../../../components/ui/Skeleton'
import { CONTENT_COPY } from '../content.copy'

/** Props de {@link ContentLoader}. */
export interface ContentLoaderProps {
  /** Estado de la carga (ver `combinedLoadState`). */
  state: ContentLoadState
  /** Vuelve a pedir el contenido (por ejemplo `refetch` de la consulta). */
  onRetry: () => void
  /** El formulario, que se dibuja solo con el contenido cargado. */
  children: ReactNode
}

/** Esqueleto de una sección de formulario: el título y tres campos. */
function SectionSkeleton(): ReactNode {
  return (
    <div className="bg-surface flex flex-col gap-4 rounded-lg p-4 shadow-sm lg:p-6">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-9" />
      <Skeleton className="h-9" />
      <Skeleton className="h-24" />
    </div>
  )
}

/**
 * Lo que muestra una página de contenido según su carga: el esqueleto con la forma de las
 * secciones (y "Cargando el contenido…" para el lector), el error "No pudimos cargar el
 * contenido." con "Reintentar", o el formulario.
 *
 * @param props - Ver {@link ContentLoaderProps}.
 */
export function ContentLoader({ state, onRetry, children }: ContentLoaderProps): ReactNode {
  if (state === 'pending') {
    return (
      <div className="flex flex-col gap-6">
        <p role="status" className="sr-only">
          {CONTENT_COPY.loading}
        </p>
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
    )
  }
  if (state === 'error') {
    return (
      <ErrorState
        title={CONTENT_COPY.loadError}
        onRetry={onRetry}
        className="bg-surface rounded-lg shadow-sm"
      />
    )
  }
  return children
}
