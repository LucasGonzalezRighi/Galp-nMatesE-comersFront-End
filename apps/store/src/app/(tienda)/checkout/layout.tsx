import type { Metadata } from 'next'
import type { ReactNode } from 'react'

/** Ninguna página del checkout se indexa: son de una compra en curso. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

/** Props de {@link CheckoutRoutesLayout}. */
interface CheckoutRoutesLayoutProps {
  /** La página del checkout. */
  children: ReactNode
}

/** Segmento `/checkout` (spec 9.1 y 14): solo fija `noindex` para todas sus páginas. */
export default function CheckoutRoutesLayout({ children }: CheckoutRoutesLayoutProps): ReactNode {
  return children
}
