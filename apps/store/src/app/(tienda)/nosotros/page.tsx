import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AboutPage, getAboutContent } from '@/features/about'

/** Título y descripción de la página (el título lleva la plantilla "· Galpón Mates"). */
export const metadata: Metadata = {
  title: 'Nosotros',
  description: 'Dos socios, un galpón y la costumbre de siempre: un buen mate al lado.',
}

/** Ruta `/nosotros`: la página con los textos editables, cacheados en el servidor. */
export default async function AboutRoute(): Promise<ReactNode> {
  const content = await getAboutContent()
  return <AboutPage content={content} />
}
