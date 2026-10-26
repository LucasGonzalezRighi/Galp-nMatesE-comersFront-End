import type { ReactNode } from 'react'
import Link from 'next/link'
import { asRoute } from '../../lib/routes'
import { PRODUCT_COPY } from './product.copy'

/** Props de {@link ProductBreadcrumbs}. */
export interface ProductBreadcrumbsProps {
  /** Nombre de la línea del producto (por ejemplo "Imperiales"). */
  categoryName: string
  /** Slug de la línea, para llevar a su listado. */
  categorySlug: string
  /** Nombre del producto, la página actual. */
  productName: string
}

/** Estilo de los enlaces de las migas. */
const LINK_CLASS = 'text-neutral-400 no-underline hover:text-foreground'

/**
 * Migas de pan de la ficha: Tienda / línea / producto (spec 9.5). Los dos primeros escalones son
 * enlaces; el último es la página actual.
 *
 * @param props - Ver {@link ProductBreadcrumbsProps}.
 */
export function ProductBreadcrumbs({
  categoryName,
  categorySlug,
  productName,
}: ProductBreadcrumbsProps): ReactNode {
  return (
    <nav
      aria-label={PRODUCT_COPY.breadcrumbLabel}
      className="mx-auto max-w-[1280px] px-[clamp(20px,5vw,64px)] pt-6"
    >
      <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0 text-[13px] text-neutral-500">
        <li>
          <Link href={asRoute('/tienda')} className={LINK_CLASS}>
            {PRODUCT_COPY.breadcrumbShop}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link
            href={asRoute(`/tienda/${encodeURIComponent(categorySlug)}`)}
            className={LINK_CLASS}
          >
            {categoryName}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="text-neutral-200">
          {productName}
        </li>
      </ol>
    </nav>
  )
}
