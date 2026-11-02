import type { ReactNode } from 'react'
import { useId } from 'react'

/** Props de {@link FieldGroup}. */
export interface FieldGroupProps {
  /** Título del grupo, que también le da nombre (`role="group"`). */
  title: string
  /** Nivel del título: `3` (por omisión, dentro de una sección) o `4` (dentro de otro grupo). */
  level?: 3 | 4
  /** Botones del grupo (subir, bajar, quitar), a la derecha del título. */
  actions?: ReactNode
  /** Los campos. */
  children: ReactNode
}

/**
 * Grupo de campos dentro de una sección (una escena, un socio, una categoría): un recuadro con
 * borde `divider`, título (`h3` o `h4`) y sus acciones.
 *
 * @param props - Ver {@link FieldGroupProps}.
 * @throws {RangeError} Si el título está vacío.
 */
export function FieldGroup({ title, level = 3, actions, children }: FieldGroupProps): ReactNode {
  const id = useId()
  const Heading = level === 4 ? 'h4' : 'h3'
  if (title.trim() === '') {
    throw new RangeError('El título del grupo de campos no puede estar vacío.')
  }
  return (
    <div
      role="group"
      aria-labelledby={id}
      className="border-divider flex flex-col gap-4 rounded-lg border p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Heading id={id} className="text-h5 min-w-0 break-words">
          {title}
        </Heading>
        {actions !== undefined && (
          <div className="flex flex-wrap items-center gap-1">{actions}</div>
        )}
      </div>
      {children}
    </div>
  )
}
