import type { Metadata, Viewport } from 'next'
import { getStoreEnv } from '@/lib/env'
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo'

/**
 * Título (con plantilla "· Galpón Mates") y descripción por omisión de todas las páginas, y el
 * origen público de la tienda (`metadataBase`), con el que Next arma las direcciones absolutas de
 * los íconos y de la imagen para compartir. Lo exportan los dos root layouts: el de la tienda
 * (`(tienda)/layout.tsx`) y el del simulador de Mercado Pago (`(simulador)/layout.tsx`).
 */
export const SITE_METADATA: Metadata = {
  metadataBase: new URL(getStoreEnv().siteUrl),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
}

/** Color de la barra del navegador en el celular, el del fondo de la tienda. */
export const SITE_VIEWPORT: Viewport = {
  themeColor: '#1a1210',
}

/** Fondo de la tienda (el del diseño): un resplandor cobrizo arriba a la derecha sobre el fondo liso. */
export const PAGE_BACKGROUND =
  'bg-background bg-[radial-gradient(1200px_720px_at_82%_-160px,color-mix(in_srgb,var(--color-accent-900)_75%,transparent),transparent_60%)]'
