'use client'

import type { ReactNode } from 'react'
import { CheckIcon } from '@phosphor-icons/react/Check'
import { Button } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { hideToast, useToastStore } from './toast.store'

/** Clases del aviso visible y oculto; oculto baja fuera de la pantalla (sin deslizarse si se pidió menos movimiento). */
const SHOWN = 'translate-y-0 opacity-100'
const HIDDEN = 'pointer-events-none translate-y-[140%] opacity-0 motion-reduce:translate-y-0'

/**
 * Aviso de la tienda (`toast` del diseño): una tarjeta abajo y al centro con un check, el título,
 * el texto de apoyo y un botón opcional. Se monta una sola vez en el layout y muestra lo último
 * que se pidió con `showToast` o `useToast().show`. Lo anuncia una región `role="status"` que
 * está siempre montada y fuera de la tarjeta (un subárbol `inert` sale del árbol de accesibilidad,
 * y una región que aparece ya con texto no se anuncia); cada aviso nuevo, aunque repita el texto,
 * vuelve a anunciarse. Oculta, la tarjeta no recibe foco ni clics. Con `prefers-reduced-motion:
 * reduce` aparece y desaparece sin deslizarse.
 */
export function Toaster(): ReactNode {
  const current = useToastStore((state) => state.current)
  const visible = useToastStore((state) => state.visible)
  const serial = useToastStore((state) => state.serial)
  const action = current?.action
  const announcement =
    visible && current !== null
      ? [current.title, current.subtitle].filter((text) => text !== undefined).join('. ')
      : ''

  return (
    <>
      {/* Lo que anuncian los lectores de pantalla, fuera del bloque `inert` y siempre montado. El
          texto va en un nodo con `key` propio: un aviso nuevo con el mismo texto cambia el nodo y se
          vuelve a anunciar. */}
      <p role="status" className="sr-only">
        {announcement === '' ? null : <span key={serial}>{announcement}</span>}
      </p>
      <div
        inert={!visible}
        data-visible={visible}
        className={cx(
          'fixed bottom-6 left-1/2 z-90 max-w-[calc(100vw-24px)] -translate-x-1/2',
          visible ? SHOWN : HIDDEN,
        )}
        style={{
          transitionProperty: 'translate, opacity',
          transitionDuration: '550ms, 400ms',
          transitionTimingFunction: 'var(--ease-main)',
        }}
      >
        <div className="bg-surface/88 flex items-center gap-[14px] rounded-[12px] py-[10px] pr-[10px] pl-[14px] shadow-md backdrop-blur-[14px]">
          <span
            aria-hidden="true"
            className="bg-accent-800 text-accent-200 grid size-[28px] flex-none place-items-center rounded-full"
          >
            <CheckIcon size={14} />
          </span>
          <div className="flex min-w-0 flex-col" aria-hidden="true">
            <span className="truncate text-[13px]">{current?.title}</span>
            {current?.subtitle === undefined ? null : (
              <span className="truncate text-[12px] text-neutral-400">{current.subtitle}</span>
            )}
          </div>
          {action === undefined ? null : (
            <Button
              variant="ghost"
              className="flex-none"
              onClick={() => {
                action.onClick()
                hideToast()
              }}
            >
              {action.label}
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
