import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { Category } from '@galpon/api-client'
import { PRODUCT_STATUSES } from '@galpon/domain'
import type { SelectOption } from '../../../components/ui/Select'
import type { ProductsSearch } from '../products-search'
import { Button } from '../../../components/ui/Button'
import { Checkbox } from '../../../components/ui/Checkbox'
import { Field } from '../../../components/ui/Field'
import { Select } from '../../../components/ui/Select'
import { TextInput } from '../../../components/ui/TextInput'
import { hasProductFilters, productsSearchSchema } from '../products-search'
import { PRODUCTS_SEARCH_DEBOUNCE_MS, PRODUCTS_SEARCH_MAX_LENGTH } from '../products.constants'
import { PRODUCTS_COPY } from '../products.copy'
import { useDebouncedValue } from '../use-debounced-value'

/** Props de {@link ProductsFilters}. */
export interface ProductsFiltersProps {
  /** Filtros de la URL, ya validados. */
  search: ProductsSearch
  /** Cambia los filtros de la URL. */
  onSearchChange: (search: ProductsSearch) => void
  /** Líneas para el filtro "Línea" (vacío mientras cargan). */
  categories: readonly Category[]
}

/** Opciones de "Estado": publicados y borradores (por omisión) y cada estado. */
const STATUS_OPTIONS: readonly SelectOption[] = [
  { value: '', label: PRODUCTS_COPY.activeStatuses },
  ...PRODUCT_STATUSES.map((status) => ({
    value: status,
    label: PRODUCTS_COPY.statusFilters[status],
  })),
]

/**
 * Texto de "Buscar" como va en la URL: recortado, o `undefined` si queda vacío.
 *
 * @param text - Lo escrito.
 * @returns El valor de `?q=`.
 */
function queryOf(text: string): string | undefined {
  const trimmed = text.trim()
  return trimmed === '' ? undefined : trimmed
}

/**
 * Filtros de `/productos`: "Buscar" (pasa a la URL 300 ms después de la última tecla), "Línea",
 * "Estado", "Solo sin stock" y "Limpiar filtros" (deja el orden). Cada cambio vuelve a la
 * primera página.
 *
 * @param props - Ver {@link ProductsFiltersProps}.
 */
export function ProductsFilters({
  search,
  onSearchChange,
  categories,
}: ProductsFiltersProps): ReactNode {
  const [text, setText] = useState(search.q ?? '')
  const [syncedQuery, setSyncedQuery] = useState(search.q)
  // La URL cambió por otro lado (volver atrás, "Limpiar filtros"): el campo la sigue, salvo que ya
  // diga lo mismo (no se le borran los espacios a quien está escribiendo).
  if (search.q !== syncedQuery) {
    setSyncedQuery(search.q)
    if (queryOf(text) !== search.q) setText(search.q ?? '')
  }
  const debouncedText = useDebouncedValue(text, PRODUCTS_SEARCH_DEBOUNCE_MS)
  const latest = useRef({ search, onSearchChange })
  useEffect(() => {
    latest.current = { search, onSearchChange }
  })
  useEffect(() => {
    const { search: current, onSearchChange: change } = latest.current
    const q = queryOf(debouncedText)
    if (q !== current.q) change({ ...current, q, pagina: undefined })
  }, [debouncedText])

  const lineOptions: readonly SelectOption[] = [
    { value: '', label: PRODUCTS_COPY.allLines },
    ...categories.map((category) => ({ value: category.slug, label: category.name })),
  ]
  const isFiltered = hasProductFilters(search)

  return (
    <div
      role="search"
      aria-label={PRODUCTS_COPY.filtersLabel}
      className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto]"
    >
      <Field label={PRODUCTS_COPY.searchLabel} className="sm:col-span-2 lg:col-span-1">
        {(control) => (
          <TextInput
            {...control}
            type="search"
            value={text}
            maxLength={PRODUCTS_SEARCH_MAX_LENGTH}
            placeholder={PRODUCTS_COPY.searchPlaceholder}
            autoComplete="off"
            onChange={(event) => {
              setText(event.target.value)
            }}
          />
        )}
      </Field>
      <Field label={PRODUCTS_COPY.lineLabel}>
        {(control) => (
          <Select
            {...control}
            options={lineOptions}
            value={search.linea ?? ''}
            onChange={(event) => {
              onSearchChange({
                ...search,
                linea: productsSearchSchema.shape.linea.parse(event.target.value),
                pagina: undefined,
              })
            }}
          />
        )}
      </Field>
      <Field label={PRODUCTS_COPY.statusLabel}>
        {(control) => (
          <Select
            {...control}
            options={STATUS_OPTIONS}
            value={search.estado ?? ''}
            onChange={(event) => {
              onSearchChange({
                ...search,
                estado: productsSearchSchema.shape.estado.parse(event.target.value),
                pagina: undefined,
              })
            }}
          />
        )}
      </Field>
      <Checkbox
        label={PRODUCTS_COPY.outOfStockOnly}
        checked={search.sinStock === 1}
        onChange={(event) => {
          onSearchChange({
            ...search,
            sinStock: event.target.checked ? 1 : undefined,
            pagina: undefined,
          })
        }}
      />
      {isFiltered && (
        <Button
          variant="ghost"
          onClick={() => {
            setText('')
            onSearchChange({ orden: search.orden })
          }}
        >
          {PRODUCTS_COPY.clearFilters}
        </Button>
      )}
    </div>
  )
}
