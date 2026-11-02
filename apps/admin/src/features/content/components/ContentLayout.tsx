import type { ReactNode } from 'react'
import { PageHeader } from '../../../components/ui/PageHeader'
import { CONTENT_COPY } from '../content.copy'
import { ContentNav } from './ContentNav'

/** Props de {@link ContentLayout}. */
export interface ContentLayoutProps {
  /** Lo que va debajo de la navegación (por ejemplo, un `ContentLoader` con el formulario). */
  children: ReactNode
}

/**
 * Estructura de las pantallas de Contenido: `PageHeader` "Contenido" con la nota sobre el formato
 * de los textos, la navegación entre las páginas ("Secciones del contenido") y, debajo, la
 * página.
 *
 * @param props - Ver {@link ContentLayoutProps}.
 */
export function ContentLayout({ children }: ContentLayoutProps): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={CONTENT_COPY.title} description={CONTENT_COPY.note} />
      <ContentNav />
      {children}
    </div>
  )
}
