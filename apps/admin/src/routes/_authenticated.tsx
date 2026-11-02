import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { isApiError } from '@galpon/api-client'
import { AdminLayout } from '../app/AdminLayout'
import { createImageUploader } from '../components/media/create-image-uploader'
import { ImageUploaderProvider } from '../components/media/ImageUploaderProvider'
import { ensureAdminSession, useSessionExpiredStore } from '../features/auth'

/**
 * Ruta de diseño de las pantallas con sesión: sin ella, redirige a `/login?redirect=…`. Con
 * sesión, dibuja la estructura del dashboard y reparte el uploader de fotos (un `401` al subir
 * abre "Tu sesión venció").
 */
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
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const context = Route.useRouteContext()
  const markSessionExpired = useSessionExpiredStore((state) => state.markSessionExpired)
  const [uploader] = useState(() => createImageUploader(context))
  return (
    <ImageUploaderProvider uploader={uploader} onUnauthorized={markSessionExpired}>
      <AdminLayout context={context} email={context.session.email}>
        <Outlet />
      </AdminLayout>
    </ImageUploaderProvider>
  )
}
