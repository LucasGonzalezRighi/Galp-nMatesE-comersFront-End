import type { ReactNode } from 'react'
import type { ProductSummary } from '@galpon/api-client'
import type { ProductSortOrder } from '@galpon/domain'
import type { InstallmentsSetting } from '../../components/ui'
import type { CatalogParams } from './catalog-query'
import type { CatalogScope } from './catalog-scope'
import { catalogCountLabel } from './catalog-query'
import { CATALOG_COPY } from './catalog.copy'
import { CatalogHero } from './CatalogHero'
import { CatalogKitBand } from './CatalogKitBand'
import { CatalogResults } from './CatalogResults'
import { CatalogToolbar } from './CatalogToolbar'

/** Ajustes públicos de la tienda que usa el catálogo. */
export interface CatalogSettings {
  /** Cuotas sin interés (`PublicSettings.installments`). */
  installments: InstallmentsSetting
  /** Si se muestra "Precio sin impuestos nacionales" (`PublicSettings.priceDisplay.showNetPrice`). */
  showNetPrice: boolean
  /** Descuento del kit en porcentaje entero (`PublicSettings.kitDiscountPercent`). */
  kitDiscountPercent: number
}

/** Props de {@link CatalogView}. */
export interface CatalogViewProps {
  /** Qué se muestra: todo el catálogo o una línea. */
  scope: CatalogScope
  /** Ajustes públicos de la tienda. */
  settings: CatalogSettings
  /** Búsqueda y orden actuales. */
  params: CatalogParams
  /** Los productos que se ven: los de `scope` ya filtrados y ordenados con `filterCatalog`. */
  visible: readonly ProductSummary[]
  /** Se llama con el texto nuevo cuando se escribe en el buscador. */
  onQueryChange: (query: string) => void
  /** Se llama con el orden elegido. */
  onOrderChange: (order: ProductSortOrder) => void
  /** Se llama al tocar "Limpiar búsqueda". */
  onClear: () => void
}

/**
 * Pantalla Tienda completa (diseño, `body.html`): cabecera con título, bajada y contador; barra
 * con líneas, buscador y orden; grilla (o el mensaje que corresponda) y banda final hacia el kit.
 * No tiene estado: recibe lo que se ve y avisa lo que la persona hace.
 *
 * @param props - Ver {@link CatalogViewProps}.
 */
export function CatalogView({
  scope,
  settings,
  params,
  visible,
  onQueryChange,
  onOrderChange,
  onClear,
}: CatalogViewProps): ReactNode {
  return (
    <div className="pb-10">
      <CatalogHero
        title={scope.line?.name ?? CATALOG_COPY.allTitle}
        blurb={scope.line?.blurb ?? CATALOG_COPY.allBlurb}
        countLabel={catalogCountLabel(visible.length)}
      />
      <CatalogToolbar
        lines={scope.lines}
        activeLine={scope.line?.slug ?? null}
        totalCount={scope.totalCount}
        params={params}
        onQueryChange={onQueryChange}
        onOrderChange={onOrderChange}
      />
      <div className="mx-auto max-w-[1280px] px-[clamp(20px,5vw,64px)] pt-7">
        <CatalogResults
          products={visible}
          hasProducts={scope.products.length > 0}
          inLine={scope.line !== null}
          query={params.query.trim()}
          replayKey={`${scope.line?.slug ?? 'todos'}:${params.order}`}
          installments={settings.installments}
          showNetPrice={settings.showNetPrice}
          onClear={onClear}
        />
        <CatalogKitBand discountPercent={settings.kitDiscountPercent} />
      </div>
    </div>
  )
}
