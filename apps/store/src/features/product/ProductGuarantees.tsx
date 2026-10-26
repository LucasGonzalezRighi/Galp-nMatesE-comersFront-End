import type { ReactNode } from 'react'
import { ArrowUUpLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowUUpLeft'
import { ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck'
import { TruckIcon } from '@phosphor-icons/react/dist/ssr/Truck'
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

/** Las garantías de la ficha, en el orden del diseño; Cambios y Arrepentimiento van por separado (spec 14.6). */
const GUARANTEES: readonly Guarantee[] = [
  {
    key: 'shipping',
    icon: <TruckIcon size={18} aria-hidden="true" />,
    ...PRODUCT_COPY.guarantees.shipping,
  },
  {
    key: 'payment',
    icon: <ShieldCheckIcon size={18} aria-hidden="true" />,
    ...PRODUCT_COPY.guarantees.payment,
  },
  {
    key: 'exchange',
    icon: <ArrowUUpLeftIcon size={18} aria-hidden="true" />,
    ...PRODUCT_COPY.guarantees.exchange,
  },
  {
    key: 'withdrawal',
    icon: <ArrowUUpLeftIcon size={18} aria-hidden="true" />,
    ...PRODUCT_COPY.guarantees.withdrawal,
  },
]

/**
 * Garantías de compra de la ficha (spec 9.5 y 14.6): envío a todo el país, pago seguro con
 * Mercado Pago, cambios (10 días, sin uso) y arrepentimiento (10 días corridos, sin causa y sin
 * costo), cada uno con su ícono.
 */
export function ProductGuarantees(): ReactNode {
  return (
    <ul
      aria-label={PRODUCT_COPY.guaranteesLabel}
      className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[14px] p-0 text-[12.5px] text-neutral-400"
    >
      {GUARANTEES.map((guarantee) => (
        <li key={guarantee.key} className="flex items-start gap-[10px]">
          <span className="text-accent flex-none">{guarantee.icon}</span>
          <span>
            <span className="text-foreground block">{guarantee.title}</span>
            {guarantee.detail}
          </span>
        </li>
      ))}
    </ul>
  )
}
