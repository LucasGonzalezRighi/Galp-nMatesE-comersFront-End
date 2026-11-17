import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { buildLegalMetadata, LegalRoute } from '@/features/legal'

/** Título de la pestaña: el título del documento (editable) con la plantilla "· Galpón Mates". */
export async function generateMetadata(): Promise<Metadata> {
  return await buildLegalMetadata('terms')
}

/** Ruta `/terminos`: los términos y condiciones. */
export default function TermsRoute(): ReactNode {
  return <LegalRoute document="terms" />
}
