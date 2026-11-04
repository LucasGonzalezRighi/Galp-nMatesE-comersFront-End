'use client'

import type { ReactNode } from 'react'
import type { ProductSummary } from '@galpon/api-client'
import type { InstallmentsSetting } from '../../components/ui'
import { GridReplay } from '../../components/motion'
import { PRODUCT_CARD_COPY, ProductGrid } from '../product-card'
import { CATALOG_DEFAULT_COLUMNS, CATALOG_ROWS } from './catalog-rows'

/** Cuántas tarjetas se cargan con prioridad: la primera hilera de la grilla de cinco columnas. */
const PRIORITY_CARDS = 5

/** Props de {@link CatalogGrid}. */
export interface CatalogGridProps {
  /** Productos que se ven, ya filtrados y ordenados. Al menos uno. */
  products: readonly ProductSummary[]
  /** Identifica el filtro y el orden: al cambiar, las tarjetas reaparecen escalonadas. */
  replayKey: string
  /** Identifica el filtro, el orden y la búsqueda: al cambiar, la grilla vuelve a 4 hileras. */
  collapseKey: string
  /** Ajuste de cuotas de la tienda. */
  installments: InstallmentsSetting
  /** Si se muestra "Precio sin impuestos nacionales". */
  showNetPrice: boolean
}

/**
 * Grilla de la tienda: la `ProductGrid` común con 4 hileras completas y "Ver más productos" que
 * despliega el resto. En el servidor y antes de medir se suponen 5 columnas (20 productos, las que
 * entran en `shop-container`). Las tarjetas de arriba van en un `GridReplay`: reaparecen
 * escalonadas al cambiar de filtro u orden (`replayKey`); al cambiar de filtro, orden o búsqueda
 * (`collapseKey`) vuelve a 4 hileras.
 *
 * @param props - Ver {@link CatalogGridProps}.
 */
export function CatalogGrid({
  products,
  replayKey,
  collapseKey,
  installments,
  showNetPrice,
}: CatalogGridProps): ReactNode {
  return (
    <ProductGrid
      products={products}
      rows={CATALOG_ROWS}
      defaultColumns={CATALOG_DEFAULT_COLUMNS}
      moreLabel={PRODUCT_CARD_COPY.moreProducts}
      installments={installments}
      showNetPrice={showNetPrice}
      collapseKey={collapseKey}
      priorityCount={PRIORITY_CARDS}
      frame={(frame) => <GridReplay replayKey={replayKey} {...frame} />}
    />
  )
}
