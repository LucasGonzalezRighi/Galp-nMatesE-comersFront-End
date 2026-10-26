'use client'

import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import { useId, useRef, useState } from 'react'
import { TabFade } from '../../components/motion'
import { cx } from '../../components/ui/cx'
import { PRODUCT_COPY } from './product.copy'

/** Una pestaña de la ficha: su título y el texto del panel. */
export interface ProductTab {
  /** Identifica la pestaña (`description`, `materials`, `shipping` o `care`). */
  id: string
  /** Título de la pestaña ("Materiales", "Contenido"…). */
  label: string
  /** Texto del panel. */
  text: string
}

/** Props de {@link ProductTabs}. */
export interface ProductTabsProps {
  /** Pestañas, en el orden en que se muestran; tiene que haber al menos una. */
  tabs: readonly ProductTab[]
}

/** Línea gris que corre debajo de las pestañas y se desvanece hacia la derecha. */
const TABLIST_STYLE: CSSProperties = {
  background:
    'linear-gradient(to right, var(--color-neutral-800), transparent) no-repeat bottom / 100% 1px',
}

/**
 * Pestañas de la ficha (Descripción, Materiales, Envío y cambios, Cuidado; spec 9.5): se eligen con
 * el mouse o con las flechas, Inicio y Fin; la línea cobre del título activo se estira de
 * izquierda a derecha y el texto cambia con un fundido (`TabFade`).
 *
 * @param props - Ver {@link ProductTabsProps}.
 * @throws {RangeError} Si no hay pestañas.
 */
export function ProductTabs({ tabs }: ProductTabsProps): ReactNode {
  const baseId = useId()
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? '')
  const buttons = useRef(new Map<string, HTMLButtonElement>())
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0]
  const tabId = (id: string): string => `${baseId}-tab-${id}`
  const panelId = `${baseId}-panel`
  if (tabs.length === 0) throw new RangeError('ProductTabs necesita al menos una pestaña.')

  const move = (target: number): void => {
    const next = tabs[(target + tabs.length) % tabs.length]
    if (next === undefined) return
    setActiveId(next.id)
    buttons.current.get(next.id)?.focus()
  }
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    const position = tabs.findIndex((tab) => tab.id === active?.id)
    if (event.key === 'ArrowRight') move(position + 1)
    else if (event.key === 'ArrowLeft') move(position - 1)
    else if (event.key === 'Home') move(0)
    else if (event.key === 'End') move(tabs.length - 1)
    else return
    event.preventDefault()
  }

  return (
    <div className="mt-[6px] flex flex-col gap-4">
      <div
        role="tablist"
        aria-label={PRODUCT_COPY.tabsLabel}
        className="flex flex-wrap gap-1"
        style={TABLIST_STYLE}
      >
        {tabs.map((tab) => {
          const selected = tab.id === active?.id
          return (
            <button
              key={tab.id}
              ref={(element) => {
                if (element === null) buttons.current.delete(tab.id)
                else buttons.current.set(tab.id, element)
              }}
              id={tabId(tab.id)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              className={cx(
                'focus-visible:outline-accent relative cursor-pointer border-0 bg-transparent px-3 py-[10px] text-[13.5px] transition-colors duration-300 focus-visible:outline-2',
                selected ? 'text-foreground' : 'text-neutral-400',
              )}
              onClick={() => {
                setActiveId(tab.id)
              }}
              onKeyDown={onKeyDown}
            >
              {tab.label}
              <span
                aria-hidden="true"
                className={cx(
                  'bg-accent ease-main absolute right-3 bottom-0 left-3 h-px origin-left transition-transform duration-500 motion-reduce:transition-none',
                  selected ? 'scale-x-100' : 'scale-x-0',
                )}
              />
            </button>
          )
        })}
      </div>
      <TabFade tabKey={active?.id ?? ''}>
        <p
          id={panelId}
          role="tabpanel"
          aria-labelledby={active === undefined ? undefined : tabId(active.id)}
          className="m-0 text-[14.5px] leading-[1.75] text-neutral-300"
        >
          {active?.text}
        </p>
      </TabFade>
    </div>
  )
}
