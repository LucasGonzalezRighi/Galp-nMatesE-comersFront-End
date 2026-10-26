'use client'

import type { ReactNode } from 'react'
import { UserIcon } from '@phosphor-icons/react/User'
import { QueryClientContext } from '@tanstack/react-query'
import Link from 'next/link'
import { useContext } from 'react'
import { iconButtonClassName } from '@/components/ui/button-styles'
import { cx } from '@/components/ui/cx'
import { asRoute } from '@/lib/routes'
import { ACCOUNT_COPY } from './account.copy'
import { ACCOUNT_HOME, LOGIN_PATH } from './return-path'
import { useSession } from './use-session'

/** Props de {@link AccountLink}. */
interface AccountLinkProps {
  /** Nombre del cliente con la sesión iniciada, o `null` sin sesión. */
  firstName: string | null
}

/** El acceso: solo el ícono sin sesión; con sesión, el ícono y el nombre (desde 640 px). */
function AccountLink({ firstName }: AccountLinkProps): ReactNode {
  if (firstName === null) {
    return (
      <Link
        href={asRoute(LOGIN_PATH)}
        aria-label={ACCOUNT_COPY.signInLink}
        className={iconButtonClassName({ variant: 'plain', size: 'md' })}
      >
        <UserIcon size={19} aria-hidden="true" />
      </Link>
    )
  }
  return (
    <Link
      href={asRoute(ACCOUNT_HOME)}
      aria-label={`${ACCOUNT_COPY.accountLink}, ${firstName}`}
      className={cx(
        iconButtonClassName({ variant: 'plain', size: 'md' }),
        'sm:w-auto sm:gap-[6px] sm:px-[10px]',
      )}
    >
      <UserIcon size={19} weight="fill" aria-hidden="true" className="text-accent" />
      <span className="hidden max-w-[12ch] truncate text-[13px] sm:inline">{firstName}</span>
    </Link>
  )
}

/** El acceso con la sesión consultada (`useSession`). */
function SessionAccountLink(): ReactNode {
  const { customer } = useSession()
  return <AccountLink firstName={customer?.firstName ?? null} />
}

/**
 * Acceso a la cuenta del encabezado: sin sesión es un ícono que lleva a ingresar; con sesión
 * muestra el nombre del cliente y lleva a `/cuenta`. Fuera de los proveedores de la tienda (por
 * ejemplo, al probar el encabezado solo) muestra el acceso sin consultar la sesión.
 */
export function AccountButton(): ReactNode {
  const queryClient = useContext(QueryClientContext)
  return queryClient === undefined ? <AccountLink firstName={null} /> : <SessionAccountLink />
}
