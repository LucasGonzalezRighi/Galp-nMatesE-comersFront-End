import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { buildLegalMetadata, LegalRoute } from '@/features/legal'

/** Título de la pestaña: el título del documento (editable) con la plantilla "· Galpón Mates". */
export async function generateMetadata(): Promise<Metadata> {
  return await buildLegalMetadata('privacy')
}

/** Ruta `/privacidad`: la política de privacidad. */
export default function PrivacyRoute(): ReactNode {
  return <LegalRoute document="privacy" />
}
