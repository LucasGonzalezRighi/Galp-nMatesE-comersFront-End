'use client'

import type { ReactNode } from 'react'
import { SignOutIcon } from '@phosphor-icons/react/SignOut'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Suspense, useState } from 'react'
import { Button } from '@/components/ui'
import { cx } from '@/components/ui/cx'
import { asRoute } from '@/lib/routes'
import { isApiError, logout } from '@galpon/api-client'
import { useApiClient } from '@galpon/api-client/react'
import { ACCOUNT_COPY } from './account.copy'
import { resetAccountState, withCsrf } from './csrf'
import { FormError } from './form-parts'
import { ACCOUNT_HOME } from './return-path'

/** Secciones del área del cliente. */
const SECTIONS = [
  { href: ACCOUNT_HOME, label: ACCOUNT_COPY.nav.overview },
  { href: '/cuenta/pedidos', label: ACCOUNT_COPY.nav.orders },
  { href: '/cuenta/direcciones', label: ACCOUNT_COPY.nav.addresses },
] as const

/** Indica si la sección `href` es la de la página actual (el detalle de un pedido es "Pedidos"). */
function isCurrent(pathname: string, href: string): boolean {
  return href === ACCOUNT_HOME ? pathname === href : pathname.startsWith(href)
}

/**
 * Cierra la sesión con el token CSRF, olvida los datos de la cuenta y vuelve al inicio. Si la
 * sesión ya no existía (`401`), igual sale.
 */
function LogoutButton(): ReactNode {
  const api = useApiClient()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  const signOut = async (): Promise<void> => {
    setPending(true)
    setFailed(false)
    try {
      await withCsrf(queryClient, api, () => logout(api))
    } catch (error) {
      if (!isApiError(error) || error.kind !== 'unauthorized') {
        setFailed(true)
        setPending(false)
        return
      }
    }
    await resetAccountState(queryClient)
    router.replace(asRoute('/'))
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="ghost"
        size="sm"
        loading={pending}
        onClick={() => {
          void signOut()
        }}
      >
        <SignOutIcon size={16} aria-hidden="true" />
        {pending ? ACCOUNT_COPY.nav.loggingOut : ACCOUNT_COPY.nav.logout}
      </Button>
      <FormError message={failed ? ACCOUNT_COPY.networkError : undefined} />
    </div>
  )
}

/** Props de {@link SectionLinks}. */
interface SectionLinksProps {
  /** Ruta actual, o `null` mientras no se conoce (ninguna sección queda marcada). */
  pathname: string | null
}

/** Los enlaces de las secciones, con `aria-current` en la de `pathname`. */
function SectionLinks({ pathname }: SectionLinksProps): ReactNode {
  return (
    <ul className="m-0 flex list-none gap-1 overflow-x-auto p-0 lg:flex-col">
      {SECTIONS.map((section) => {
        const current = pathname !== null && isCurrent(pathname, section.href)
        return (
          <li key={section.href} className="flex-none">
            <Link
              href={asRoute(section.href)}
              aria-current={current ? 'page' : undefined}
              className={cx(
                'block rounded-md px-3 py-2 text-[14px] transition-colors',
                current
                  ? 'bg-accent/12 text-accent'
                  : 'hover:bg-foreground/7 hover:text-foreground text-neutral-300',
              )}
            >
              {section.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/** Los enlaces con la ruta actual (`usePathname`). */
function CurrentSectionLinks(): ReactNode {
  return <SectionLinks pathname={usePathname()} />
}

/**
 * Navegación del área del cliente: Resumen, Pedidos y Direcciones (con `aria-current` en la
 * actual) y "Cerrar sesión". En el celular va en una fila con scroll; desde 1024 px, en columna.
 * La ruta actual se lee dentro de un `<Suspense>` (Cache Components), como en el encabezado.
 */
export function AccountNav(): ReactNode {
  return (
    <nav aria-label={ACCOUNT_COPY.nav.label} className="flex flex-col gap-3">
      <Suspense fallback={<SectionLinks pathname={null} />}>
        <CurrentSectionLinks />
      </Suspense>
      <LogoutButton />
    </nav>
  )
}
