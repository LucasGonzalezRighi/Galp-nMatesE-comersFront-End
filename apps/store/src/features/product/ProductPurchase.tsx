'use client'

import type { MouseEvent, ReactNode } from 'react'
import { HandbagIcon } from '@phosphor-icons/react/Handbag'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ProductDetail } from '@galpon/api-client'
import type { Leather } from '@galpon/domain'
import { initialLeather, remainingQuantityFor } from '@galpon/domain'
import { Magnetic } from '../../components/motion'
import { Button, QuantityStepper, Swatch } from '../../components/ui'
import { asRoute } from '../../lib/routes'
import { addProductToCart, clickOrigin, useCart } from '../cart'
import { hideToast } from '../toast'
import { PRODUCT_COPY } from './product.copy'

/** Props de {@link ProductPurchase}. */
export interface ProductPurchaseProps {
  /** La ficha del producto. */
  product: ProductDetail
  /** Mail de contacto de la tienda (`PublicSettings.contactEmail`), para "Consultar por mail". */
  contactEmail: string
}

/** Arma el enlace `mailto:` de la consulta, con el asunto "Consulta: {nombre}". */
function consultHref(contactEmail: string, productName: string): string {
  const subject = encodeURIComponent(`${PRODUCT_COPY.consultSubject} ${productName}`)
  return `mailto:${contactEmail}?subject=${subject}`
}

/** Título de una elección ("Cuero") con lo elegido a la derecha. */
function OptionHeading({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div className="flex justify-between text-[13px]">
      <span className="text-neutral-400">{label}</span>
      <span>{value}</span>
    </div>
  )
}

/**
 * Compra desde la ficha (spec 9.5): el cuero (una muestra por cada uno que ofrece el producto,
 * arranca en Negro si está y si no en el primero) solo si el producto ofrece cueros, cantidad, "Agregar al carrito" (vuelo al carrito) y "Comprar ahora" (agrega y va al
 * checkout). Si el producto no se puede comprar (sin precio o sin stock), en lugar de eso muestra
 * "Consultar por mail" con el asunto "Consulta: {nombre}".
 *
 * La cantidad máxima sale de `remainingQuantityFor` contando todo lo que ya hay en el carrito, y
 * el tope lo vuelve a aplicar `addProductToCart`, así un doble clic nunca lo supera.
 *
 * @param props - Ver {@link ProductPurchaseProps}.
 */
export function ProductPurchase({ product, contactEmail }: ProductPurchaseProps): ReactNode {
  const router = useRouter()
  const { lines } = useCart()
  const [leather, setLeather] = useState<Leather | null>(() => initialLeather(product.leathers))
  const [wanted, setWanted] = useState(1)

  const remaining = remainingQuantityFor(product.id, product.maxQuantity, lines)
  const quantity = Math.min(wanted, Math.max(1, remaining))
  const atCartLimit = remaining < 1
  const chosenOptions = leather === null ? undefined : { leather }

  const add = (event: MouseEvent<HTMLButtonElement>): void => {
    addProductToCart({
      product,
      quantity,
      options: chosenOptions,
      origin: clickOrigin(event),
    })
  }
  const buyNow = (): void => {
    const result = addProductToCart({ product, quantity, options: chosenOptions })
    if (result.status === 'unavailable') return
    // El aviso "Agregado" no aporta nada si ya vamos al checkout.
    hideToast()
    router.push(asRoute('/checkout'))
  }

  return (
    <div className="flex flex-col gap-5">
      {product.leathers.length === 0 || leather === null ? null : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <OptionHeading label={PRODUCT_COPY.leather} value={leather} />
            <div role="group" aria-label={PRODUCT_COPY.leather} className="flex gap-3">
              {product.leathers.map((option) => (
                <Swatch
                  key={option}
                  leather={option}
                  selected={option === leather}
                  onClick={() => {
                    setLeather(option)
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      {product.isPurchasable ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <QuantityStepper value={quantity} max={remaining} onChange={setWanted} />
            <Magnetic strength={0.22} className="min-w-0 flex-[1_1_220px] *:flex-1">
              <Button
                size="lg"
                fill="gray"
                fullWidth
                disabled={atCartLimit}
                title={atCartLimit ? PRODUCT_COPY.cartLimit : undefined}
                className="shadow-[0_0_32px_-10px_var(--color-accent)]"
                onClick={add}
              >
                <HandbagIcon size={18} aria-hidden="true" />
                {PRODUCT_COPY.addToCart}
              </Button>
            </Magnetic>
          </div>
          <Button variant="secondary" size="lg" fullWidth onClick={buyNow}>
            {PRODUCT_COPY.buyNow}
          </Button>
        </>
      ) : (
        <Button asChild size="lg" fullWidth>
          <a href={consultHref(contactEmail, product.name)}>{PRODUCT_COPY.consultByMail}</a>
        </Button>
      )}
    </div>
  )
}
