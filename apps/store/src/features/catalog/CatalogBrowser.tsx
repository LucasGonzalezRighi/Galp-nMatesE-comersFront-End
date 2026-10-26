'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
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

/**
 * Tiempo sin escribir, en milisegundos, antes de reflejar la búsqueda en la dirección. Cada cambio
 * de la dirección hace que `PageEnter` vuelva a animar la página, así que no se escribe en cada
 * tecla.
 */
export const URL_SYNC_DELAY_MS = 500

/** No hace nada: los controles de la versión que se ve antes de hidratar. */
const NOOP = (): void => undefined

/** Props de {@link CatalogBrowser}. */
export interface CatalogBrowserProps {
  /** Qué se muestra: todo el catálogo o una línea, ya resuelto en el servidor. */
  scope: CatalogScope
  /** Ajustes públicos de la tienda. */
  settings: CatalogSettings
}

/** Estado local del catálogo: lo que se ve ahora y cómo se relaciona con la dirección. */
interface BrowserState {
  /** `?q=&orden=` de la dirección vista por última vez (para notar un cambio hecho desde afuera). */
  seenUrl: string
  /** Texto del buscador. */
  query: string
  /** Orden elegido. */
  order: ProductSortOrder
  /** Direcciones que escribió este componente y todavía no volvieron como cambio de la dirección. */
  written: readonly string[]
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

/** Catálogo con la búsqueda y el orden: leídos de la dirección y mantenidos en el estado. */
function CatalogWithUrl({ scope, settings }: CatalogBrowserProps): ReactNode {
  const searchParams = useSearchParams()
  const fromUrl = readCatalogParams(searchParams.get('q'), searchParams.get('orden'))
  const urlSearch = catalogSearch(fromUrl)
  const [state, setState] = useState<BrowserState>({
    seenUrl: urlSearch,
    query: fromUrl.query,
    order: fromUrl.order,
    written: [],
  })

  // La dirección cambió. Si es el eco de lo que escribió este componente se conserva lo que se ve
  // (la persona pudo seguir escribiendo); si cambió desde afuera (por ejemplo la búsqueda del
  // encabezado o el botón "atrás") se adopta. Se ajusta durante el render, sin efectos.
  let current = state
  if (state.seenUrl !== urlSearch) {
    current = state.written.includes(urlSearch)
      ? {
          ...state,
          seenUrl: urlSearch,
          written: state.written.filter((item) => item !== urlSearch),
        }
      : { seenUrl: urlSearch, query: fromUrl.query, order: fromUrl.order, written: [] }
    setState(current)
  }

  const params: CatalogParams = { query: current.query, order: current.order }
  const wanted = catalogSearch(params)
  const pending = current.written[current.written.length - 1] ?? current.seenUrl

  // Refleja la búsqueda y el orden en la dirección cuando la persona deja de escribir.
  useEffect(() => {
    if (wanted === pending) return undefined
    const timer = setTimeout(() => {
      setState((previous) => ({ ...previous, written: [...previous.written, wanted] }))
      try {
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}${wanted}${window.location.hash}`,
        )
      } catch {
        // Sin acceso al historial la tienda sigue funcionando: solo no queda en la dirección.
      }
    }, URL_SYNC_DELAY_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [wanted, pending])

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
 * ve al instante y se refleja en la dirección (con `history.replaceState`, sin sumar entradas al
 * historial) recién cuando se deja de escribir; así se puede compartir la dirección y el botón
 * "atrás" vuelve a la búsqueda.
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
