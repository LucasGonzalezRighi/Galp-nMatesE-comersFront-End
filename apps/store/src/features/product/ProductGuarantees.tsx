import type { ReactNode } from 'react'
import { ArrowUUpLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowUUpLeft'
import { CreditCardIcon } from '@phosphor-icons/react/dist/ssr/CreditCard'
import { SealCheckIcon } from '@phosphor-icons/react/dist/ssr/SealCheck'
import { TruckIcon } from '@phosphor-icons/react/dist/ssr/Truck'
import Link from 'next/link'
import type { ProductGroup } from '@galpon/domain'
import { asRoute } from '@/lib/routes'
import { PRODUCT_COPY } from './product.copy'

/** Una garantía: su ícono, título y detalle. */
interface Guarantee {
  /** Clave estable. */
  key: string
  /** Ícono de 18 px (se pinta en color de acento). */
  icon: ReactNode
  /** Título, en el color del texto. */
  title: string
  /** Detalle, en gris. */
  detail: string
}

/** La garantía legal de 6 meses (Ley 24.240): no aplica a la yerba (LA-7). */
const WARRANTY: Guarantee = {
  key: 'warranty',
  icon: <SealCheckIcon size={18} aria-hidden="true" />,
  ...PRODUCT_COPY.guarantees.warranty,
}

/**
 * Las garantías de la ficha, en el orden del diseño; Cambios, Garantía legal y Arrepentimiento van
 * por separado (spec 14.6).
 */
function guaranteesFor(group: ProductGroup): Guarantee[] {
  return [
    {
      key: 'shipping',
      icon: <TruckIcon size={18} aria-hidden="true" />,
      ...PRODUCT_COPY.guarantees.shipping,
    },
    {
      key: 'payment',
      icon: <CreditCardIcon size={18} aria-hidden="true" />,
      ...PRODUCT_COPY.guarantees.payment,
    },
    {
      key: 'exchange',
      icon: <ArrowUUpLeftIcon size={18} aria-hidden="true" />,
      ...PRODUCT_COPY.guarantees.exchange,
    },
    ...(group === 'yerba' ? [] : [WARRANTY]),
    {
      key: 'withdrawal',
      icon: <ArrowUUpLeftIcon size={18} aria-hidden="true" />,
      ...PRODUCT_COPY.guarantees.withdrawal,
    },
  ]
}

/** Props de {@link ProductGuarantees}. */
export interface ProductGuaranteesProps {
  /** Grupo del producto: la garantía legal no se muestra en `yerba`. */
  group: ProductGroup
}

/**
 * Garantías de compra de la ficha (spec 9.5 y 14.6, LA-7): envío a todo el país, pago con
 * Mercado Pago, cambios (30 días corridos, sin uso), garantía legal de 6 meses (salvo en la yerba)
 * y arrepentimiento (10 días corridos, sin causa y sin costo), cada uno con su ícono, y debajo el
 * enlace a `/devoluciones`.
 *
 * @param props - Ver {@link ProductGuaranteesProps}.
 */
export function ProductGuarantees({ group }: ProductGuaranteesProps): ReactNode {
  return (
    <div className="flex flex-col gap-[14px]">
      <ul
        aria-label={PRODUCT_COPY.guaranteesLabel}
        className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[14px] p-0 text-[12.5px] text-neutral-400"
      >
        {guaranteesFor(group).map((guarantee) => (
          <li key={guarantee.key} className="flex items-start gap-[10px]">
            <span className="text-accent flex-none">{guarantee.icon}</span>
            <span>
              <span className="text-foreground block">{guarantee.title}</span>
              {guarantee.detail}
            </span>
          </li>
        ))}
      </ul>
      <Link
        href={asRoute('/devoluciones')}
        className="text-accent-300 hover:text-accent-200 inline-flex min-h-[24px] items-center self-start text-[12.5px] underline underline-offset-2"
      >
        {PRODUCT_COPY.policyLink}
      </Link>
    </div>
  )
}
