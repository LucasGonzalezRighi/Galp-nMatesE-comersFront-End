'use client'

import type { MouseEvent, ReactNode } from 'react'
import { PlusIcon } from '@phosphor-icons/react/Plus'
import Link from 'next/link'
import type { ProductSummary } from '@galpon/api-client'
import { remainingQuantityFor } from '@galpon/domain'
import { IconButton, Price } from '../../components/ui'
import { buttonFxClassName } from '../../components/ui/Button'
import { ButtonFx } from '../../components/ui/ButtonFx'
import { cx } from '../../components/ui/cx'
import { asRoute } from '../../lib/routes'
import { addProductToCart, clickOrigin, useCart } from '../cart'
import { addProductLabel, HOME_COPY } from './home.copy'

/** Props de {@link StoryProductRow}. */
export interface StoryProductRowProps {
  /** El producto, como lo devuelve el listado de la API. */
  product: ProductSummary
  /** Fondo de la escena donde está: define el color de la línea que lo separa del siguiente. */
  tone: 'dark' | 'light'
}

/**
 * El "+" lleno de gris (Ruling MR-16) pone el ícono en blanco aunque la fila le imponga su color
 * (`text-inherit!`).
 */
const ADD_FILLED_TEXT = 'hover:text-[#fff]! focus-visible:text-[#fff]!'

/** El ícono "+" gira 90° con el hover o el foco del botón. */
const ADD_ICON_CLASS =
  'ease-main transition-[rotate] duration-300 motion-safe:group-hover/btn:rotate-90 motion-safe:group-focus-visible/btn:rotate-90'

/**
 * Fila de producto de una escena de la historia: nombre y precio (llevan a la ficha) y el botón
 * "+" que lo agrega al carrito con el vuelo. Respeta el tope de compra (`remainingQuantityFor` de
 * `@galpon/domain`, contando todas las líneas del carrito): con todo lo disponible ya en el
 * carrito, el botón se deshabilita. En los mates agrega Negro y Alpaca cincelada.
 *
 * @param props - Ver {@link StoryProductRowProps}.
 */
export function StoryProductRow({ product, tone }: StoryProductRowProps): ReactNode {
  const { lines } = useCart()
  const atCartLimit =
    product.isPurchasable && remainingQuantityFor(product.id, product.maxQuantity, lines) < 1
  const cannotBuy = !product.isPurchasable || atCartLimit
  const add = (event: MouseEvent<HTMLButtonElement>): void => {
    addProductToCart({ product, origin: clickOrigin(event) })
  }
  return (
    <li
      className={cx(
        'home-row flex items-center justify-between gap-[14px] py-[var(--story-row-pad,14px)]',
        tone === 'dark' ? 'home-row--dark' : 'home-row--light',
      )}
    >
      <Link
        href={asRoute(`/producto/${encodeURIComponent(product.slug)}`)}
        className="flex min-w-0 flex-col gap-[2px] text-inherit no-underline"
      >
        <span className="text-[16px]">{product.name}</span>
        <Price amount={product.priceArs} size="sm" className="text-[13px]! opacity-70" />
      </Link>
      <IconButton
        variant="plain"
        aria-label={addProductLabel(product.name)}
        title={atCartLimit ? HOME_COPY.cartLimit : undefined}
        disabled={cannotBuy}
        className={cx(
          'flex-none rounded-full! text-inherit! shadow-[inset_0_0_0_1px_currentColor]',
          !cannotBuy && buttonFxClassName('gray'),
          !cannotBuy && ADD_FILLED_TEXT,
        )}
        onClick={add}
      >
        {cannotBuy ? null : <ButtonFx interactive={false} />}
        <PlusIcon size={15} aria-hidden="true" className={ADD_ICON_CLASS} />
      </IconButton>
    </li>
  )
}
