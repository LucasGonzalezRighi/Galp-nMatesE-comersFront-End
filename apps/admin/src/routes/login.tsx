import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import type { AdminLoginResult } from '@galpon/api-client'
import { isApiError } from '@galpon/api-client'
import { adminCsrfQuery, adminSessionQuery } from '@galpon/api-client/react'
import { ensureAdminSession, LoginForm } from '../features/auth'
import { safeRedirectPath } from '../lib/redirect'

/** `?redirect=` con la ruta a la que volver; si no es un texto, se ignora. */
const searchSchema = z.object({ redirect: z.string().optional().catch(undefined) })

/** Ruta `/login`: el formulario de acceso; con sesión abierta redirige a `?redirect=` (o a `/`). */
export const Route = createFileRoute('/login')({
  validateSearch: searchSchema,
  beforeLoad: async ({ context, search }) => {
    // Con sesión abierta no se muestra el login. Si la API no responde, sí: el formulario avisa.
    const session = await ensureAdminSession(context).catch((error: unknown) => {
      if (isApiError(error)) return null
      throw error
    })
    if (session !== null) throw redirect({ href: safeRedirectPath(search.redirect) })
  },
  component: LoginPage,
})

function LoginPage() {
  const { api, queryClient, setCsrfToken } = Route.useRouteContext()
  const { redirect: redirectTo } = Route.useSearch()
  const navigate = useNavigate()

  function handleSuccess(session: AdminLoginResult) {
    // El login ya devuelve la sesión y el token: se guardan para no pedirlos otra vez.
    setCsrfToken(session.csrfToken)
    queryClient.setQueryData(adminSessionQuery(api).queryKey, {
      email: session.email,
      expiresAt: session.expiresAt,
    })
    queryClient.setQueryData(adminCsrfQuery(api).queryKey, { csrfToken: session.csrfToken })
    void navigate({ href: safeRedirectPath(redirectTo) })
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1>Galpón Mates</h1>
        <p className="text-neutral-400">Ingresá para administrar la tienda.</p>
      </header>
      <LoginForm onSuccess={handleSuccess} />
    </main>
  )
}
