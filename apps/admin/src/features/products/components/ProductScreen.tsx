import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { isApiError } from '@galpon/api-client'
import { adminProductQuery, useApiClient } from '@galpon/api-client/react'
import { formatDate, formatDateTime } from '@galpon/domain'
import { buttonClass } from '../../../components/ui/button-class'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Skeleton } from '../../../components/ui/Skeleton'
import { PRODUCT_FORM_COPY, productMetaText } from '../products.copy'
import { ProductForm } from './ProductForm'

/** Props de {@link ProductScreen}. */
export interface ProductScreenProps {
  /** Identificador del producto, tal como viene en la dirección (`/productos/$id`). */
  id: string
}

/** Enlace "Productos" del encabezado. */
const BACK = { to: '/productos', label: PRODUCT_FORM_COPY.back } as const

/** Esqueleto del formulario mientras carga: las secciones. */
function ProductFormSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="sr-only">
        {PRODUCT_FORM_COPY.loading}
      </p>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
    </div>
  )
}

/**
 * Pantalla `/productos/$id`: el nombre con el código y las fechas, y el formulario para editarlo.
 * Un producto que no existe (o un identificador que no sirve) muestra "No encontramos ese
 * producto." con "Volver a productos".
 *
 * @param props - Ver {@link ProductScreenProps}.
 */
export function ProductScreen({ id }: ProductScreenProps): ReactNode {
  const api = useApiClient()
  const productQuery = useQuery(adminProductQuery(api, id))
  const product = productQuery.data
  const error = productQuery.error
  const notFound =
    product === undefined &&
    ((isApiError(error) && error.kind === 'not_found') || error instanceof RangeError)

  if (notFound) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={PRODUCT_FORM_COPY.productTitle} back={BACK} />
        <div className="bg-surface rounded-lg shadow-sm">
          <EmptyState
            title={PRODUCT_FORM_COPY.notFound}
            action={
              <Link to="/productos" className={buttonClass('secondary', 'md')}>
                {PRODUCT_FORM_COPY.backToList}
              </Link>
            }
          />
        </div>
      </div>
    )
  }

  if (product === undefined) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={PRODUCT_FORM_COPY.productTitle} back={BACK} />
        {productQuery.isError ? (
          <div className="bg-surface rounded-lg shadow-sm">
            <ErrorState
              title={PRODUCT_FORM_COPY.loadError}
              description={isApiError(error) ? error.message : undefined}
              onRetry={() => {
                void productQuery.refetch()
              }}
            />
          </div>
        ) : (
          <ProductFormSkeleton />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={product.name}
        back={BACK}
        description={
          <span className="tabular-nums">
            {productMetaText(
              product.code,
              formatDate(product.createdAt),
              formatDateTime(product.updatedAt),
            )}
          </span>
        }
      />
      <ProductForm key={product.id} product={product} />
    </div>
  )
}
