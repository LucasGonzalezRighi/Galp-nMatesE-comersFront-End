'use client'

import type { ReactNode } from 'react'
import { useId, useState } from 'react'
import { Button } from '../../components/ui'
import { ReviewForm } from './ReviewForm'
import { REVIEWS_COPY } from './reviews.copy'

/** Props de {@link ReviewsLayout}. */
export interface ReviewsLayoutProps {
  /** Slug del producto que se reseña. */
  slug: string
  /** Nombre del producto, para el título del formulario. */
  productName: string
  /** El resumen (promedio, estrellas y distribución), dibujado en el servidor. */
  summary: ReactNode
  /** El listado de reseñas, dibujado en el servidor. */
  list: ReactNode
}

/**
 * Las dos columnas de las reseñas: a la izquierda el resumen y el botón "Escribir una reseña", y
 * a la derecha el formulario (cuando está abierto) sobre el listado. El resumen y el listado
 * llegan ya dibujados; esta pieza solo guarda si el formulario está abierto.
 *
 * @param props - Ver {@link ReviewsLayoutProps}.
 */
export function ReviewsLayout({ slug, productName, summary, list }: ReviewsLayoutProps): ReactNode {
  const [open, setOpen] = useState(false)
  const formId = useId()

  return (
    <div className="flex flex-wrap items-start gap-x-[72px] gap-y-10">
      <div className="flex flex-[0_1_300px] flex-col gap-4">
        {summary}
        <Button
          className="mt-[6px] self-start"
          aria-expanded={open}
          aria-controls={formId}
          onClick={() => {
            setOpen((current) => !current)
          }}
        >
          {REVIEWS_COPY.write}
        </Button>
      </div>
      <div className="flex min-w-0 flex-[1_1_420px] flex-col">
        <div id={formId}>
          {open ? (
            <ReviewForm
              slug={slug}
              productName={productName}
              onClose={() => {
                setOpen(false)
              }}
            />
          ) : null}
        </div>
        {list}
      </div>
    </div>
  )
}
