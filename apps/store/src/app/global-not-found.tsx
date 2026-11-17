import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { SITE_NAME } from '@/lib/seo'
import StoreRootLayout from './(tienda)/layout'
import NotFound from './(tienda)/not-found'
import { SITE_METADATA, SITE_VIEWPORT } from './site-shell'

/**
 * Descripción y `metadataBase` comunes (ver {@link SITE_METADATA}) y el título "Página no
 * encontrada · Galpón Mates" (WCAG 2.4.2): `absolute`, porque la plantilla de un root layout no se
 * aplica a su propio título.
 */
export const metadata: Metadata = {
  ...SITE_METADATA,
  title: { absolute: `Página no encontrada · ${SITE_NAME}` },
}

/** Color de la barra del navegador en el celular (ver {@link SITE_VIEWPORT}). */
export const viewport: Viewport = SITE_VIEWPORT

/**
 * Página 404 de las direcciones que no existen (spec 9.7). Con dos root layouts (`(tienda)` y
 * `(simulador)`) no hay `app/layout.tsx` con el que Next arme la 404 de las rutas desconocidas, así
 * que esta página (`experimental.globalNotFound`) la arma con el root layout de la tienda y su
 * `not-found.tsx`: se ve igual que antes, con el encabezado y el pie.
 */
export default function GlobalNotFound(): ReactNode {
  return (
    <StoreRootLayout>
      <NotFound />
    </StoreRootLayout>
  )
}
