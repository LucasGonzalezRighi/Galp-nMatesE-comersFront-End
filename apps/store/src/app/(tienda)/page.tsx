import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { HomePage } from '@/features/home'
import { getStoreEnv } from '@/lib/env'
import { buildPageMetadata, SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo'

/** Título del inicio sin la plantilla "· Galpón Mates" (sería redundante), más dirección y datos para compartir. */
export const metadata: Metadata = {
  ...buildPageMetadata({
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    path: '/',
    siteUrl: getStoreEnv().siteUrl,
  }),
  title: { absolute: SITE_NAME },
}

/** Inicio de la tienda (estático; se regenera cuando el backend invalida el caché). */
export default function Page(): ReactNode {
  return <HomePage />
}
