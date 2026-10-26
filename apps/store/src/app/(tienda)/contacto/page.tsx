import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ContactPage } from '@/features/contact'
import { getPublicSettings } from '@/lib/data/settings'
import { getStoreEnv } from '@/lib/env'
import { buildPageMetadata } from '@/lib/seo'

/** Título y descripción de la página (el título lleva la plantilla "· Galpón Mates"). */
export const metadata: Metadata = buildPageMetadata({
  title: 'Contacto',
  description: 'Escribinos por mail: te respondemos a la brevedad.',
  path: '/contacto',
  siteUrl: getStoreEnv().siteUrl,
})

/** Ruta `/contacto`: el mail, los datos de atención del vendedor y el formulario. */
export default async function ContactRoute(): Promise<ReactNode> {
  const settings = await getPublicSettings()
  return <ContactPage settings={settings} />
}
