import type { ReactNode } from 'react'
import { AccountLayout } from '@/features/account'

/** Props de {@link AccountAreaLayout}. */
interface AccountAreaLayoutProps {
  /** La página de la sección. */
  children: ReactNode
}

/** Área del cliente (`/cuenta`, pedidos y direcciones): el marco con la navegación de la cuenta. */
export default function AccountAreaLayout({ children }: AccountAreaLayoutProps): ReactNode {
  return <AccountLayout>{children}</AccountLayout>
}
