import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getLegalContent, LegalPage } from '@/features/legal'
import { getStoreEnv } from '@/lib/env'
import { buildPageMetadata } from '@/lib/seo'

/** Título de la pestaña: el título del documento (editable) con la plantilla "· Galpón Mates". */
export async function generateMetadata(): Promise<Metadata> {
  const { title } = await getLegalContent('terms')
  return buildPageMetadata({
    title,
    description: 'Condiciones de compra, envío, cambios y devoluciones de Galpón Mates.',
    path: '/terminos',
    siteUrl: getStoreEnv().siteUrl,
  })
}

/** Ruta `/terminos`: los términos y condiciones. */
export default async function TermsRoute(): Promise<ReactNode> {
  const content = await getLegalContent('terms')
  return <LegalPage content={content} />
}
