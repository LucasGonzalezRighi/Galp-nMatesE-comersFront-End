import type { ChangeEvent, ReactNode } from 'react'
import { MagnifyingGlassIcon } from '@phosphor-icons/react/MagnifyingGlass'
import Link from 'next/link'
import type { ProductSortOrder } from '@galpon/domain'
import { isProductSortOrder, PRODUCT_SORT_ORDERS } from '@galpon/domain'
import type { CatalogParams } from './catalog-query'
import type { CatalogLine } from './catalog-scope'
import { Input, Select } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { asRoute } from '../../lib/routes'
import { catalogHref } from './catalog-scope'
import { CATALOG_COPY } from './catalog.copy'

/** Base de un botón de línea: píldora de 36 px con la cantidad al lado. */
const LINE_BASE =
  'inline-flex h-9 flex-none items-center gap-2 rounded-full border px-[14px] text-[13px] no-underline transition-all duration-[350ms]'

/** Botón de la línea que se está viendo: cobre con un resplandor. */
const LINE_ON =
  'border-accent bg-accent/14 text-accent-200 shadow-[0_0_20px_-6px_var(--color-accent)]'

/** Botón de una línea que no se está viendo. */
const LINE_OFF = 'border-neutral-800 text-neutral-300'

/** Props de {@link CatalogToolbar}. */
export interface CatalogToolbarProps {
  /** Las líneas, en el orden del listado. */
  lines: readonly CatalogLine[]
  /** Slug de la línea que se ve, o `null` para "Todos". */
  activeLine: string | null
  /** Cantidad de piezas de todo el catálogo (el número de "Todos"). */
  totalCount: number
  /** Búsqueda y orden actuales: se muestran y se conservan al cambiar de línea. */
  params: CatalogParams
  /** Se llama con el texto nuevo cada vez que se escribe en el buscador. */
  onQueryChange: (query: string) => void
  /** Se llama con el orden elegido. */
  onOrderChange: (order: ProductSortOrder) => void
}

/**
 * Barra pegada bajo el encabezado (diseño, pantalla Tienda): botones de línea con su cantidad
 * (enlaces a `/tienda` y `/tienda/{línea}`, que conservan la búsqueda y el orden), el buscador y la
 * lista de orden.
 *
 * @param props - Ver {@link CatalogToolbarProps}.
 */
export function CatalogToolbar({
  lines,
  activeLine,
  totalCount,
  params,
  onQueryChange,
  onOrderChange,
}: CatalogToolbarProps): ReactNode {
  const onSearch = (event: ChangeEvent<HTMLInputElement>): void => {
    onQueryChange(event.target.value)
  }
  const onSort = (event: ChangeEvent<HTMLSelectElement>): void => {
    if (isProductSortOrder(event.target.value)) onOrderChange(event.target.value)
  }
  const entries: { slug: string | null; name: string; count: number }[] = [
    { slug: null, name: CATALOG_COPY.allLines, count: totalCount },
    ...lines,
  ]
  return (
    <div className="bg-background/82 sticky top-16 z-20 py-3 backdrop-blur-[14px]">
      <div className="site-container flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label={CATALOG_COPY.linesNav}
          className="flex max-w-full [scrollbar-width:none] gap-2 overflow-x-auto p-[2px]"
        >
          {entries.map((entry) => {
            const active = entry.slug === activeLine
            return (
              <Link
                key={entry.slug ?? 'todos'}
                href={asRoute(catalogHref(entry.slug, params))}
                aria-current={active ? 'page' : undefined}
                className={cx(LINE_BASE, active ? LINE_ON : LINE_OFF)}
              >
                {entry.name}{' '}
                <span className="text-[11px] text-neutral-500 tabular-nums">{entry.count}</span>
              </Link>
            )
          })}
        </nav>
        <div role="search" className="flex max-w-[440px] flex-[1_1_300px] items-center gap-[10px]">
          <div className="relative flex-1">
            <MagnifyingGlassIcon
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-[11px] -mt-[7.5px] text-neutral-400"
            />
            <Input
              type="search"
              value={params.query}
              onChange={onSearch}
              placeholder={CATALOG_COPY.searchPlaceholder}
              aria-label={CATALOG_COPY.searchLabel}
              autoComplete="off"
              className="min-h-[38px]! pl-[34px]!"
            />
          </div>
          <Select
            value={params.order}
            onChange={onSort}
            aria-label={CATALOG_COPY.sortLabel}
            className="min-h-[38px]! w-auto!"
          >
            {PRODUCT_SORT_ORDERS.map((order) => (
              <option key={order} value={order}>
                {CATALOG_COPY.sortOptions[order]}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  )
}
