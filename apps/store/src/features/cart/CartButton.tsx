'use client'

import type { ReactNode } from 'react'
import { HandbagIcon } from '@phosphor-icons/react/Handbag'
import { pluralize } from '@galpon/domain'
import { Magnetic } from '../../components/motion'
import { Button } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { openCart } from './actions'
import { CART_COPY } from './cart.copy'
import { useCart } from './cart.store'

/**
 * Botón "Carrito" del encabezado con el contador de unidades (`.btn-secondary` del diseño). Abre
 * el panel del carrito. El contador rebota cuando se agrega algo (`flyToCart`) y queda invisible
 * hasta que se lee `localStorage` (`hasHydrated`), reservando su lugar para que el encabezado no
 * salte. Se acerca al mouse como un imán.
 *
 * Por debajo de 410 px muestra solo el ícono, con el contador sobre su esquina: con el texto, la
 * fila del encabezado (logo, lupa, cuenta, carrito y menú) mide 406 px con su relleno y el botón
 * "Menú", la única entrada a la navegación del celular, se salía de la ventana a 375 y 360 px
 * (reflow, WCAG 1.4.10). El nombre accesible no cambia.
 *
 * Nombre accesible (WCAG 2.5.3, "Etiqueta en el nombre"): una vez leído el carrito incluye el
 * texto visible, "Carrito" y el contador ("Abrir carrito, 2 productos"; vacío, "Abrir carrito, 0
 * productos"). Un espacio separa las dos partes en el DOM para que se lean como dos palabras.
 */
export function CartButton(): ReactNode {
  const { count, hasHydrated } = useCart()
  const label = hasHydrated
    ? `${CART_COPY.openCart}, ${pluralize(count, 'producto', 'productos')}`
    : CART_COPY.openCart

  return (
    <Magnetic strength={0.3}>
      <Button
        variant="secondary"
        aria-label={label}
        aria-haspopup="dialog"
        className="relative min-h-[38px] w-[38px] px-0! min-[410px]:w-auto min-[410px]:gap-[8px]! min-[410px]:px-[14px]!"
        onClick={openCart}
        data-cart-button=""
      >
        <HandbagIcon size={18} aria-hidden="true" />
        <span className="hidden min-[410px]:inline">{CART_COPY.title}</span>{' '}
        <span
          aria-hidden="true"
          className={cx(
            'bg-accent-800 text-accent-100 absolute -top-[6px] -right-[5px] inline-grid h-[20px] min-w-[20px] place-items-center rounded-full px-[6px] text-[11px] tabular-nums min-[410px]:static',
            !hasHydrated && 'invisible',
          )}
          data-cart-badge=""
        >
          {hasHydrated ? count : 0}
        </span>
      </Button>
    </Magnetic>
  )
}
