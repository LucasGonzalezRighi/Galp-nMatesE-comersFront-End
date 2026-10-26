import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getLegalContent, LegalPage } from '@/features/legal'

/** Título de la pestaña: el título del documento (editable) con la plantilla "· Galpón Mates". */
export async function generateMetadata(): Promise<Metadata> {
  const { title } = await getLegalContent('privacy')
  return { title }
}

/** Ruta `/privacidad`: la política de privacidad. */
export default async function PrivacyRoute(): Promise<ReactNode> {
  const content = await getLegalContent('privacy')
  return <LegalPage content={content} />
}
