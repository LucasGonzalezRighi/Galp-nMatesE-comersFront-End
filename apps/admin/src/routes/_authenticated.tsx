import { createFileRoute, redirect } from '@tanstack/react-router'
import { isApiError } from '@galpon/api-client'
import { ensureAdminSession } from '../features/auth'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    try {
      return { session: await ensureAdminSession(context) }
    } catch (error) {
      if (isApiError(error) && error.kind === 'unauthorized') {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- `redirect()` devuelve el objeto que el router espera recibir con `throw`.
        throw redirect({ to: '/login', search: { redirect: location.href } })
      }
      throw error
    }
  },
})
