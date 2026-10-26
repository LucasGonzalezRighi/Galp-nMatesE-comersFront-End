import type { Metadata } from 'next'
import type { ReactNode } from 'react'

/** Ninguna página de la cuenta se indexa: son personales o de acceso. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

/** Props de {@link AccountRoutesLayout}. */
interface AccountRoutesLayoutProps {
  /** La página de la cuenta. */
  children: ReactNode
}

/** Segmento `/cuenta` (spec 9.1): solo fija `noindex` para todas sus páginas. */
export default function AccountRoutesLayout({ children }: AccountRoutesLayoutProps): ReactNode {
  return children
}
