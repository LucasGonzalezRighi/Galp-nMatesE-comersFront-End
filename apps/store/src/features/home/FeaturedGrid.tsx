'use client'

import type { ReactNode } from 'react'
import type { ProductSummary } from '@galpon/api-client'
import type { InstallmentsSetting } from '../../components/ui'
import { PRODUCT_CARD_COPY, PRODUCT_GRID_CLASS, ProductGrid } from '../product-card'
import { FeaturedExit } from './FeaturedExit'

/** Hileras que se ven con una columna antes de "Ver más productos". */
const FEATURED_ROWS = 3

/**
 * Columnas que se suponen en el servidor y antes de medir: con 4, el HTML trae todos los
 * destacados (4 × 3 ≥ 8) y sin JavaScript no hay botón.
 */
const FEATURED_DEFAULT_COLUMNS = 4

/** Solo se pliega con una columna (el celular); desde la tableta se ven todos (Ruling AT-2). */
const FEATURED_COLLAPSE_MAX_COLUMNS = 1

/** La grilla común, con hasta 4 columnas desde 1440 px. */
const FEATURED_GRID_CLASS = `${PRODUCT_GRID_CLASS} min-[1440px]:grid-cols-4`

/** Props de {@link FeaturedGrid}. */
export interface FeaturedGridProps {
  /** Los destacados del inicio. */
  products: readonly ProductSummary[]
  /** Ajuste de cuotas de la tienda. */
  installments: InstallmentsSetting
  /** Si se muestra "Precio sin impuestos nacionales". */
  showNetPrice: boolean
}

/**
 * La grilla de "Los más vendidos" del inicio: la `ProductGrid` común dentro de {@link FeaturedExit}
 * (que se despide con el scroll desde 1024 px). Con una sola columna (el celular) muestra 3
 * tarjetas apiladas y "Ver más productos"; con dos o más, todos los destacados y sin botón. Es un
 * componente cliente porque le pasa una función (el marco) a la grilla.
 *
 * @param props - Ver {@link FeaturedGridProps}.
 */
export function FeaturedGrid({
  products,
  installments,
  showNetPrice,
}: FeaturedGridProps): ReactNode {
  return (
    <ProductGrid
      products={products}
      rows={FEATURED_ROWS}
      defaultColumns={FEATURED_DEFAULT_COLUMNS}
      collapseMaxColumns={FEATURED_COLLAPSE_MAX_COLUMNS}
      moreLabel={PRODUCT_CARD_COPY.moreProducts}
      installments={installments}
      showNetPrice={showNetPrice}
      className={FEATURED_GRID_CLASS}
      frame={(frame) => <FeaturedExit {...frame} />}
    />
  )
}
