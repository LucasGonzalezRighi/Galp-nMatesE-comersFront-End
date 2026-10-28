import type { ReactNode } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { Dialog as RadixDialog } from 'radix-ui'
import { useRef } from 'react'
import type { AdminLoginResult } from '@galpon/api-client'
import { queryKeys } from '@galpon/api-client/react'
import type { SessionContext } from '../session'
import { Button } from '../../../components/ui/Button'
import { toast } from '../../../components/ui/toast'
import { AUTH_COPY } from '../auth.copy'
import { storeAdminSession } from '../session'
import { useSessionExpiredStore } from '../session-expired.store'
import { LoginForm } from './LoginForm'

/** Props de {@link SessionExpiredDialog}. */
export interface SessionExpiredDialogProps {
  /** `api`, `queryClient` y `setCsrfToken` del contexto del router. */
  context: SessionContext
  /** Email de la sesión que venció: el formulario arranca con él. */
  email: string
}

/** Evita que el diálogo se cierre con Escape o tocando afuera: solo se sale entrando de nuevo. */
function preventClose(event: Event): void {
  event.preventDefault()
}

/**
 * Diálogo "Tu sesión venció": se abre cuando una consulta o una escritura de una pantalla
 * abierta da `401` (Ruling P4-3) y no se cierra con Escape ni tocando afuera. Trae el formulario
 * de ingreso con el email cargado; al entrar guarda la sesión, se cierra, vuelve a pedir los datos
 * del dashboard y avisa "Listo, ya podés seguir.". Lo editado sigue en pantalla para volver a
 * guardarlo. "Ir a la pantalla de ingreso" lleva a `/login?redirect=` con la ruta actual (si la
 * pantalla tiene cambios sin guardar, `UnsavedChangesGuard` pregunta antes).
 *
 * @param props - Ver {@link SessionExpiredDialogProps}.
 */
export function SessionExpiredDialog({ context, email }: SessionExpiredDialogProps): ReactNode {
  const isExpired = useSessionExpiredStore((state) => state.isExpired)
  const href = useLocation({ select: (location) => location.href })
  const navigate = useNavigate()
  const contentRef = useRef<HTMLDivElement>(null)

  function handleSuccess(result: AdminLoginResult) {
    storeAdminSession(context, result)
    void context.queryClient.invalidateQueries({ queryKey: ['admin'] })
    toast.success(AUTH_COPY.loggedInAgain)
  }

  function goToLogin() {
    // Sin la sesión vieja en la caché, `/login` no la toma por vigente y muestra el formulario.
    context.queryClient.removeQueries({ queryKey: queryKeys.adminSession() })
    context.queryClient.removeQueries({ queryKey: queryKeys.adminCsrf() })
    void navigate({ to: '/login', search: { redirect: href } })
  }

  return (
    <RadixDialog.Root open={isExpired}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="bg-background/70 fixed inset-0 z-40 transition-opacity duration-150 ease-out motion-reduce:transition-none starting:opacity-0" />
        <RadixDialog.Content
          ref={contentRef}
          onEscapeKeyDown={preventClose}
          onPointerDownOutside={preventClose}
          onInteractOutside={preventClose}
          onOpenAutoFocus={(event) => {
            // El email ya está cargado: el foco va a la contraseña.
            const password =
              contentRef.current?.querySelector<HTMLInputElement>('input[type="password"]')
            if (password === null || password === undefined) return
            event.preventDefault()
            password.focus()
          }}
          className="bg-surface text-foreground fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[400px] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-lg p-4 shadow-lg transition-opacity duration-150 ease-out outline-none motion-reduce:transition-none lg:p-6 starting:opacity-0"
        >
          <div className="flex flex-col gap-1">
            <RadixDialog.Title className="text-h4">{AUTH_COPY.expiredTitle}</RadixDialog.Title>
            <RadixDialog.Description className="text-sm text-neutral-400">
              {AUTH_COPY.expiredDescription}
            </RadixDialog.Description>
          </div>
          <LoginForm defaultEmail={email} onSuccess={handleSuccess} />
          <Button variant="ghost" onClick={goToLogin}>
            {AUTH_COPY.goToLogin}
          </Button>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
