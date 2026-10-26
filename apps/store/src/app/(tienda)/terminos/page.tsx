import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getLegalContent, LegalPage } from '@/features/legal'

/** Título de la pestaña: el título del documento (editable) con la plantilla "· Galpón Mates". */
export async function generateMetadata(): Promise<Metadata> {
  const { title } = await getLegalContent('terms')
  return { title }
}

/** Ruta `/terminos`: los términos y condiciones. */
export default async function TermsRoute(): Promise<ReactNode> {
  const content = await getLegalContent('terms')
  return <LegalPage content={content} />
}
