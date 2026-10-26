'use client'

import type { CSSProperties, ReactNode } from 'react'
import { LockIcon } from '@phosphor-icons/react/Lock'
import { XIcon } from '@phosphor-icons/react/X'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect } from 'react'
import { formatDiscountPesos, formatPesos, pesos } from '@galpon/domain'
import { Float } from '../../components/motion'
import { Button, Dialog, IconButton, NetPrice } from '../../components/ui'
import { asRoute } from '../../lib/routes'
import { closeCart } from './actions'
import { CART_COPY } from './cart.copy'
import { useCart } from './cart.store'
import './cart-drawer.css'
import { CartLineItem } from './CartLineItem'
import { useCartSync } from './use-cart-sync'
import { useCartView } from './use-cart-view'

/** Línea fina con los extremos desvanecidos bajo el encabezado del panel. */
const DIVIDER_STYLE: CSSProperties = {
  background:
    'linear-gradient(to right, transparent, var(--color-divider) 48px, var(--color-divider) calc(100% - 48px), transparent)',
}

/** Carrito vacío: ilustración, texto y botón a la tienda. */
function EmptyCart(): ReactNode {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <Float>
        <Image
          src="/brand/galpon-mark.png"
          alt=""
          width={64}
          height={85}
          className="h-auto w-[64px] opacity-85"
        />
      </Float>
      <p className="text-[18px]">{CART_COPY.emptyTitle}</p>
      <p className="text-[14px] text-neutral-400">{CART_COPY.emptyText}</p>
      <Button asChild className="min-h-[44px] px-[20px]! no-underline">
        <Link href={asRoute('/tienda')} onClick={closeCart}>
          {CART_COPY.emptyAction}
        </Link>
      </Button>
    </div>
  )
}

/**
 * Panel lateral del carrito (spec 9.4 y 9.5), un `Dialog` pegado a la derecha que se desliza en
 * 650 ms. Muestra "Carrito (N)", las líneas con su importe, el "Ahorro por kit" (informativo), el
 * "Subtotal" (con su "Precio sin impuestos nacionales" si el ajuste está activo) y "El envío se
 * calcula en el checkout.", con "Finalizar compra" (lleva a `/checkout` y se deshabilita si hay
 * líneas sin stock o sin datos, o mientras se actualiza la cotización) y "Seguir comprando". Vacío
 * muestra la ilustración con "Ir a la tienda". Al abrirse concilia el carrito con el catálogo y lo
 * cotiza con la API: los importes, el ahorro por kit y el precio sin impuestos salen de esa
 * cotización, sin cálculos locales. Se monta una sola vez en el layout.
 */
export function CartDrawer(): ReactNode {
  const { isOpen, hasHydrated } = useCart()
  const syncCart = useCartSync()
  const { view, isError, isUpdating } = useCartView({ enabled: isOpen })
  const { totals } = view

  useEffect(() => {
    if (isOpen) void syncCart()
  }, [isOpen, syncCart])

  const hasSoldOut = view.lines.some((line) => line.status === 'sold-out')

  return (
    <Dialog
      open={isOpen && hasHydrated}
      onClose={closeCart}
      title={`${CART_COPY.title} (${String(view.count)})`}
      hideTitle
      placement="end"
      unstyled
      className="cart-panel flex h-full w-[min(440px,100vw)] flex-col shadow-lg"
      backdropClassName="cart-backdrop bg-neutral-900/60 backdrop-blur-[4px]"
    >
      <div className="flex items-center justify-between px-5 py-[18px]">
        <span aria-hidden="true" className="text-[18px]">
          {CART_COPY.title} <span className="text-neutral-500 tabular-nums">({view.count})</span>
        </span>
        <IconButton aria-label={CART_COPY.closeCart} onClick={closeCart}>
          <XIcon size={18} aria-hidden="true" />
        </IconButton>
      </div>
      <div className="h-px" style={DIVIDER_STYLE} />
      {view.lines.length === 0 ? (
        <EmptyCart />
      ) : (
        <>
          <ul className="flex-1 overflow-y-auto px-5 py-2">
            {view.lines.map((line) => (
              <CartLineItem key={line.key} line={line} />
            ))}
          </ul>
          <div className="flex flex-col gap-[10px] px-5 pt-[18px] pb-[22px] shadow-[0_-1px_0_var(--color-neutral-800)]">
            {totals.kitSavingsArs > 0 ? (
              <div className="text-accent-300 flex justify-between text-[13px]">
                <span>{CART_COPY.kitSavings}</span>
                <span className="tabular-nums">
                  {formatDiscountPesos(pesos(totals.kitSavingsArs))}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between text-[16px]">
              <span>{CART_COPY.subtotal}</span>
              <span className="tabular-nums">{formatPesos(pesos(totals.subtotalArs))}</span>
            </div>
            <NetPrice amount={totals.netSubtotalArs} className="-mt-[6px] text-right" />
            <span className="text-[12px] text-neutral-500">{CART_COPY.shippingNote}</span>
            {hasSoldOut ? (
              <span role="alert" className="text-danger text-[12px]">
                {CART_COPY.blocked}
              </span>
            ) : null}
            {isError ? (
              <span role="alert" className="text-danger text-[12px]">
                {CART_COPY.updateFailed}
              </span>
            ) : null}
            <Button
              asChild
              disabled={!view.canCheckout || isUpdating}
              className="min-h-[48px] w-full gap-[10px] text-[15px] shadow-[0_0_30px_-10px_var(--color-accent)]"
            >
              <Link href={asRoute('/checkout')} onClick={closeCart}>
                <LockIcon size={16} aria-hidden="true" />
                {CART_COPY.checkout}
              </Link>
            </Button>
            <Button variant="ghost" className="self-center" onClick={closeCart}>
              {CART_COPY.keepShopping}
            </Button>
          </div>
        </>
      )}
    </Dialog>
  )
}
