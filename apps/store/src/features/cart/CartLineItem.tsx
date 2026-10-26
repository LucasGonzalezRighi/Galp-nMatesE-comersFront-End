'use client'

import type { CSSProperties, ReactNode } from 'react'
import { TrashIcon } from '@phosphor-icons/react/Trash'
import Image from 'next/image'
import { formatPesos } from '@galpon/domain'
import type { CartLineView } from './cart-view'
import { Reveal } from '../../components/motion'
import {
  IconButton,
  ImageWithPlaceholder,
  NetPrice,
  Price,
  QuantityStepper,
  Tag,
} from '../../components/ui'
import { CART_COPY } from './cart.copy'
import { useCartStore } from './cart.store'

/** Línea fina con los extremos desvanecidos que separa las líneas (la del diseño). */
const DIVIDER_STYLE: CSSProperties = {
  background:
    'linear-gradient(to right, transparent, var(--color-neutral-800) 48px, var(--color-neutral-800) calc(100% - 48px), transparent) no-repeat bottom / 100% 1px',
}

/** Props de {@link CartLineItem}. */
export interface CartLineItemProps {
  /** La línea con sus datos ya resueltos. */
  line: CartLineView
}

/** Foto de la línea (72 por 88 px): la del producto, su silueta o, en un kit, el logo sobre un brillo. */
function LineImage({ line }: CartLineItemProps): ReactNode {
  return (
    <div
      aria-hidden="true"
      className="bg-surface relative h-[88px] w-[72px] flex-none overflow-hidden rounded-lg"
    >
      {line.line.type === 'kit' ? (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_30%,var(--color-accent-800),transparent_80%)]">
          <Image
            src="/brand/galpon-mark.png"
            alt=""
            width={30}
            height={40}
            className="h-auto w-[30px]"
          />
        </div>
      ) : (
        <ImageWithPlaceholder
          src={line.image?.url}
          alt={line.image?.alt ?? line.name}
          sizes="72px"
          className="size-full"
        />
      )}
    </div>
  )
}

/**
 * Una línea del panel del carrito (spec 9.5): foto, nombre, detalle, "Ahorrás $…" en los kits,
 * "Precio sin impuestos nacionales" por unidad en un producto suelto si el ajuste está activo,
 * cantidad ("−" en 1 quita la línea), botón de quitar y total de la línea. Una línea sin stock
 * muestra "Sin stock" y solo se puede quitar. Aparece desde la izquierda con `Reveal`.
 *
 * @param props - Ver {@link CartLineItemProps}.
 */
export function CartLineItem({ line }: CartLineItemProps): ReactNode {
  const { setLineQuantity, removeLine } = useCartStore.getState()
  const savings = line.amounts?.savingsArs
  const remove = (): void => {
    removeLine(line.key)
  }

  return (
    <Reveal kind="left" as="li">
      <div className="flex gap-[14px] py-[14px]" style={DIVIDER_STYLE}>
        <LineImage line={line} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex justify-between gap-[10px]">
            <span className="text-[14px] leading-[1.3]">{line.name}</span>
            <IconButton
              aria-label={`${CART_COPY.removeLine} ${line.name}`}
              className="size-[28px]! flex-none text-neutral-400!"
              onClick={remove}
            >
              <TrashIcon size={15} aria-hidden="true" />
            </IconButton>
          </div>
          {line.detail === '' ? null : (
            <span className="text-[12px] text-neutral-400">{line.detail}</span>
          )}
          {savings !== undefined && savings > 0 ? (
            <span className="text-accent-300 text-[12px]">
              {CART_COPY.youSave} {formatPesos(savings)}
            </span>
          ) : null}
          <NetPrice amount={line.netPriceArs} />
          <div className="mt-auto flex items-center justify-between gap-[10px]">
            {line.status === 'sold-out' ? (
              <Tag variant="neutral">{CART_COPY.soldOut}</Tag>
            ) : (
              <QuantityStepper
                size="sm"
                value={line.quantity}
                max={line.maxQuantity}
                onChange={(quantity) => {
                  setLineQuantity(line.key, Math.min(quantity, line.maxQuantity))
                }}
                onRemove={remove}
              />
            )}
            {line.amounts === null ? null : <Price amount={line.amounts.totalArs} size="sm" />}
          </div>
        </div>
      </div>
    </Reveal>
  )
}
