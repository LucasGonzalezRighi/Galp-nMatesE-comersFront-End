import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getLegalContent, LegalPage } from '@/features/legal'
import { getStoreEnv } from '@/lib/env'
import { buildPageMetadata } from '@/lib/seo'

/** Título de la pestaña: el título del documento (editable) con la plantilla "· Galpón Mates". */
export async function generateMetadata(): Promise<Metadata> {
  const { title } = await getLegalContent('privacy')
  return buildPageMetadata({
    title,
    description: 'Cómo cuidamos y usamos tus datos personales en Galpón Mates.',
    path: '/privacidad',
    siteUrl: getStoreEnv().siteUrl,
  })
}

/** Ruta `/privacidad`: la política de privacidad. */
export default async function PrivacyRoute(): Promise<ReactNode> {
  const content = await getLegalContent('privacy')
  return <LegalPage content={content} />
}
