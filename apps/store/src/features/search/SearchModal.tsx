'use client'

import type { CSSProperties, ReactNode, SubmitEvent } from 'react'
import { MagnifyingGlassIcon } from '@phosphor-icons/react/MagnifyingGlass'
import { XIcon } from '@phosphor-icons/react/X'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { closeSearch, useSearchOpen } from '@/components/layout/search-trigger'
import { Reveal } from '@/components/motion'
import { Button, Dialog, IconButton, Price, Spinner } from '@/components/ui'
import { asRoute } from '@/lib/routes'
import { useApiClient } from '@galpon/api-client/react'
import { pluralize } from '@galpon/domain'
import {
  enterHref,
  lineHref,
  matchProducts,
  MAX_SEARCH_RESULTS,
  productHref,
  shopSearchHref,
} from './search-logic'
import { searchCatalogQuery, searchLinesQuery } from './search-queries'
import { noResultsText, SEARCH_COPY } from './search.copy'
import { useSearchShortcut } from './use-search-shortcut'

/** Raya bajo el campo: cobre a la izquierda y se desvanece (la del diseño). */
const FIELD_UNDERLINE: CSSProperties = {
  background:
    'linear-gradient(90deg, var(--color-accent), transparent) no-repeat bottom / 100% 1px',
}

/** Línea divisora que se desvanece en los extremos, bajo cada resultado (la del diseño). */
const ROW_DIVIDER: CSSProperties = {
  background:
    'linear-gradient(to right, transparent, var(--color-neutral-800) 48px, var(--color-neutral-800) calc(100% - 48px), transparent) no-repeat bottom / 100% 1px',
}

/**
 * Modal de búsqueda (spec 9.5): se abre con la lupa del encabezado (`openSearch`) o con "/"
 * fuera de los campos de texto, y pone el foco en el campo. Con el campo vacío muestra las
 * líneas; al escribir, hasta 6 productos (nombre, descripción y línea, sin acentos), o "Sin
 * resultados para “…”." y el link "Ver todos los resultados en la tienda". Enter abre la ficha si
 * hay un solo resultado y, si no, va a `/tienda?q=` con el texto codificado. Se cierra con Escape,
 * con un clic afuera o al elegir un resultado, y al cerrarse se limpia lo escrito.
 *
 * El catálogo se pide al abrir por primera vez (con un indicador de carga) y queda en caché. Se
 * monta una sola vez en el layout de la tienda.
 */
export function SearchModal(): ReactNode {
  const open = useSearchOpen()
  const router = useRouter()
  const api = useApiClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [wasOpen, setWasOpen] = useState(open)
  useSearchShortcut()

  // Al cerrarse (Escape, clic afuera, "Cerrar búsqueda" o un resultado) se olvida lo escrito: al
  // reabrir, el campo empieza vacío. Se ajusta durante el render, sin efecto, al cambiar `open`.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (!open) setQuery('')
  }

  const catalog = useQuery({ ...searchCatalogQuery(api), enabled: open })
  const lines = useQuery({ ...searchLinesQuery(api), enabled: open })

  const text = query.trim()
  const matches = matchProducts(catalog.data ?? [], query)
  const shown = matches.slice(0, MAX_SEARCH_RESULTS)

  const onSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault()
    closeSearch()
    router.push(asRoute(enterHref(matches, query)))
  }

  return (
    <Dialog
      open={open}
      onClose={closeSearch}
      title={SEARCH_COPY.title}
      hideTitle
      placement="top"
      unstyled
      initialFocusRef={inputRef}
      className="flex max-h-full w-[min(720px,100%)] flex-col overflow-y-auto"
    >
      <Reveal kind="up" duration={600} className="flex flex-col gap-5">
        <form
          role="search"
          onSubmit={onSubmit}
          className="flex items-center gap-[14px] pb-[14px]"
          style={FIELD_UNDERLINE}
        >
          <MagnifyingGlassIcon size={24} className="text-accent flex-none" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="searchbox"
            aria-label={SEARCH_COPY.inputLabel}
            placeholder={SEARCH_COPY.placeholder}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
            }}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            className="text-foreground caret-accent min-w-0 flex-1 border-0 bg-transparent text-[clamp(22px,3vw,32px)] tracking-[-0.02em] outline-none placeholder:text-neutral-500 focus-visible:outline-none"
          />
          <IconButton aria-label={SEARCH_COPY.close} onClick={closeSearch}>
            <XIcon size={18} aria-hidden="true" />
          </IconButton>
        </form>

        {text === '' ? (
          <div role="group" aria-label={SEARCH_COPY.lines} className="flex flex-wrap gap-2">
            {(lines.data ?? []).map((line) => (
              <Button
                key={line.id}
                asChild
                variant="secondary"
                className="rounded-full!"
                onClick={closeSearch}
              >
                <Link href={asRoute(lineHref(line.slug))}>{line.name}</Link>
              </Button>
            ))}
          </div>
        ) : null}

        {catalog.isPending && catalog.fetchStatus !== 'idle' ? (
          <div className="text-accent">
            <Spinner size={20} label={SEARCH_COPY.loading} />
          </div>
        ) : null}

        {catalog.isError ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 text-neutral-400">
            <p>{SEARCH_COPY.error}</p>
            <Button
              variant="ghost"
              onClick={() => {
                void catalog.refetch()
              }}
            >
              {SEARCH_COPY.retry}
            </Button>
          </div>
        ) : null}

        {catalog.isSuccess && text !== '' ? (
          shown.length === 0 ? (
            <p role="status" className="text-neutral-400">
              {noResultsText(text)}
            </p>
          ) : (
            <>
              <p role="status" className="sr-only">
                {pluralize(matches.length, 'resultado', 'resultados')}
              </p>
              <ul aria-label={SEARCH_COPY.results} className="flex flex-col">
                {shown.map((product) => (
                  <li key={product.id}>
                    <Link
                      href={asRoute(productHref(product.slug))}
                      onClick={closeSearch}
                      className="text-foreground flex items-center justify-between gap-4 px-[6px] py-[14px] no-underline"
                      style={ROW_DIVIDER}
                    >
                      <span className="flex flex-col gap-[2px]">
                        <span className="text-[16px]">{product.name}</span>
                        <span className="text-accent text-[12px]">{product.categoryName}</span>
                      </span>
                      <Price amount={product.priceArs} size="sm" />
                    </Link>
                  </li>
                ))}
              </ul>
              <Button asChild variant="ghost" className="gap-2 self-start" onClick={closeSearch}>
                <Link href={asRoute(shopSearchHref(text))}>{SEARCH_COPY.seeAll}</Link>
              </Button>
            </>
          )
        ) : null}
      </Reveal>
    </Dialog>
  )
}
