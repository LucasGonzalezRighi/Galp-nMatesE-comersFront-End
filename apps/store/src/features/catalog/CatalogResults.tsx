import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { ProductSummary } from '@galpon/api-client'
import type { InstallmentsSetting } from '../../components/ui'
import { Float } from '../../components/motion'
import { Button } from '../../components/ui'
import { asRoute } from '../../lib/routes'
import { CATALOG_COPY } from './catalog.copy'
import { CatalogGrid } from './CatalogGrid'

/** Props de {@link CatalogResults}. */
export interface CatalogResultsProps {
  /** Productos que se ven, ya filtrados y ordenados. */
  products: readonly ProductSummary[]
  /** Si la línea (o el catálogo) tiene productos publicados, sin contar la búsqueda. */
  hasProducts: boolean
  /** Si se está viendo una línea: cambia el texto cuando no tiene productos. */
  inLine: boolean
  /** Texto buscado, recortado: para el mensaje de "sin resultados" y para volver a 4 hileras. */
  query: string
  /** Identifica el filtro y el orden: al cambiar, las tarjetas reaparecen escalonadas. */
  replayKey: string
  /** Ajuste de cuotas de la tienda. */
  installments: InstallmentsSetting
  /** Si se muestra "Precio sin impuestos nacionales". */
  showNetPrice: boolean
  /** Borra la búsqueda. */
  onClear: () => void
}

/** Isotipo que flota arriba de los mensajes vacíos. */
function FloatingMark(): ReactNode {
  return (
    <Float className="opacity-80">
      <Image src="/brand/galpon-mark.png" alt="" width={56} height={74} className="h-auto w-14" />
    </Float>
  )
}

/**
 * Lo que va debajo de la barra: la grilla de tarjetas (4 hileras y "Más productos", ver
 * {@link CatalogGrid}), el mensaje de "No encontramos resultados" con su botón "Limpiar
 * búsqueda", o el de la línea sin productos con el link a toda la tienda. La búsqueda se muestra
 * como texto (React la escapa), nunca como HTML.
 *
 * @param props - Ver {@link CatalogResultsProps}.
 */
export function CatalogResults({
  products,
  hasProducts,
  inLine,
  query,
  replayKey,
  installments,
  showNetPrice,
  onClear,
}: CatalogResultsProps): ReactNode {
  if (!hasProducts) {
    return (
      <div className="flex flex-col items-start gap-4 py-[72px]">
        <FloatingMark />
        <p className="m-0 text-[22px] tracking-[-0.01em]">
          {inLine ? CATALOG_COPY.emptyLine : CATALOG_COPY.emptyShop}
        </p>
        {inLine ? (
          <Button asChild>
            <Link href={asRoute('/tienda')}>{CATALOG_COPY.emptyLineLink}</Link>
          </Button>
        ) : null}
      </div>
    )
  }
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 py-[72px]">
        <FloatingMark />
        <p className="m-0 text-[22px] tracking-[-0.01em] [overflow-wrap:anywhere]">
          {CATALOG_COPY.noResults(query)}
        </p>
        <Button onClick={onClear}>{CATALOG_COPY.clearSearch}</Button>
      </div>
    )
  }
  return (
    <CatalogGrid
      products={products}
      replayKey={replayKey}
      collapseKey={`${replayKey}:${query}`}
      installments={installments}
      showNetPrice={showNetPrice}
    />
  )
}
