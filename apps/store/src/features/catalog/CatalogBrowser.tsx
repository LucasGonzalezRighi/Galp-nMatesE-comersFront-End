'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import type { ProductSortOrder } from '@galpon/domain'
import type { CatalogParams } from './catalog-query'
import type { CatalogScope } from './catalog-scope'
import type { CatalogSettings } from './CatalogView'
import {
  catalogSearch,
  DEFAULT_CATALOG_ORDER,
  filterCatalog,
  readCatalogParams,
} from './catalog-query'
import { CatalogView } from './CatalogView'

/** No hace nada: los controles de la versión que se ve antes de hidratar. */
const NOOP = (): void => undefined

/** Props de {@link CatalogBrowser}. */
export interface CatalogBrowserProps {
  /** Qué se muestra: todo el catálogo o una línea, ya resuelto en el servidor. */
  scope: CatalogScope
  /** Ajustes públicos de la tienda. */
  settings: CatalogSettings
}

/** Estado local del catálogo: lo que se ve ahora y la dirección de la que se tomó. */
interface BrowserState {
  /** `?q=&orden=` de la dirección vista por última vez (para notar un cambio hecho desde afuera). */
  seenUrl: string
  /** Texto del buscador. */
  query: string
  /** Orden elegido. */
  order: ProductSortOrder
}

/** Versión sin filtrar del catálogo: lo que sale en el HTML del servidor y mientras hidrata. */
function CatalogFallback({ scope, settings }: CatalogBrowserProps): ReactNode {
  const params: CatalogParams = { query: '', order: DEFAULT_CATALOG_ORDER }
  return (
    <CatalogView
      scope={scope}
      settings={settings}
      params={params}
      visible={filterCatalog(scope.products, params)}
      onQueryChange={NOOP}
      onOrderChange={NOOP}
      onClear={NOOP}
    />
  )
}

/**
 * Catálogo con la búsqueda y el orden: leídos de la dirección y mantenidos en el estado. No se
 * escribe en la dirección mientras se tipea: cada cambio de `?q=` haría que `PageEnter` vuelva a
 * animar toda la página, buscador y grilla incluidos.
 */
function CatalogWithUrl({ scope, settings }: CatalogBrowserProps): ReactNode {
  const searchParams = useSearchParams()
  const fromUrl = readCatalogParams(searchParams.get('q'), searchParams.get('orden'))
  const urlSearch = catalogSearch(fromUrl)
  const [state, setState] = useState<BrowserState>({
    seenUrl: urlSearch,
    query: fromUrl.query,
    order: fromUrl.order,
  })

  // La dirección cambió desde afuera (por ejemplo la búsqueda del encabezado o el botón "atrás"):
  // se adopta. Se ajusta durante el render, sin efectos.
  let current = state
  if (state.seenUrl !== urlSearch) {
    current = { seenUrl: urlSearch, query: fromUrl.query, order: fromUrl.order }
    setState(current)
  }

  const params: CatalogParams = { query: current.query, order: current.order }

  return (
    <CatalogView
      scope={scope}
      settings={settings}
      params={params}
      visible={filterCatalog(scope.products, params)}
      onQueryChange={(query) => {
        setState((previous) => ({ ...previous, query }))
      }}
      onOrderChange={(order) => {
        setState((previous) => ({ ...previous, order }))
      }}
      onClear={() => {
        setState((previous) => ({ ...previous, query: '' }))
      }}
    />
  )
}

/**
 * Catálogo interactivo de `/tienda` y `/tienda/[linea]`: filtra por búsqueda y ordena en el
 * cliente, sin pedir nada al servidor.
 *
 * La búsqueda (`?q=`) y el orden (`?orden=`) se leen de la dirección con `useSearchParams`, dentro
 * de un `<Suspense>` como pide una página estática: el HTML del servidor trae el catálogo
 * completo y sin filtrar, y al hidratar se aplica lo que diga la dirección. Lo que se escribe se
 * ve al instante pero no se escribe en la dirección: cambiarla hace que `PageEnter` vuelva a
 * animar toda la página en cada pausa. Los botones de línea sí conservan la búsqueda y el orden
 * en sus links.
 *
 * @param props - Ver {@link CatalogBrowserProps}.
 */
export function CatalogBrowser(props: CatalogBrowserProps): ReactNode {
  return (
    <Suspense fallback={<CatalogFallback {...props} />}>
      <CatalogWithUrl {...props} />
    </Suspense>
  )
}
