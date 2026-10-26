import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { FaqPage, getFaqContent } from '@/features/faq'
import { getStoreEnv } from '@/lib/env'
import { buildPageMetadata } from '@/lib/seo'

/** Título y descripción de la página (el título lleva la plantilla "· Galpón Mates"). */
export const metadata: Metadata = buildPageMetadata({
  title: 'Preguntas frecuentes',
  description: 'Envíos, pagos y cuotas, curado del mate, cambios y devoluciones.',
  path: '/preguntas-frecuentes',
  siteUrl: getStoreEnv().siteUrl,
})

/**
 * Ruta `/preguntas-frecuentes`: las categorías y el acordeón. El ancla `#envios` (o la de otra
 * categoría) abre esa categoría.
 */
export default async function FaqRoute(): Promise<ReactNode> {
  const content = await getFaqContent()
  return <FaqPage content={content} />
}
