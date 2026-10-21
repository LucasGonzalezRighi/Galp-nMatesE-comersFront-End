import { createFileRoute, redirect } from '@tanstack/react-router'
import { isApiError } from '@galpon/api-client'
import { ensureAdminSession } from '../features/auth'

/** Ruta de diseño de las pantallas con sesión: sin ella, redirige a `/login?redirect=…`. */
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    try {
      return { session: await ensureAdminSession(context) }
    } catch (error) {
      if (isApiError(error) && error.kind === 'unauthorized') {
        throw redirect({ to: '/login', search: { redirect: location.href } })
      }
      throw error
    }
  },
})
