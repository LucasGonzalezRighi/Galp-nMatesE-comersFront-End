import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { buildLegalMetadata, LegalRoute } from '@/features/legal'

/** Título de la pestaña: el título del documento (editable) con la plantilla "· Galpón Mates". */
export async function generateMetadata(): Promise<Metadata> {
  return await buildLegalMetadata('returns')
}

/** Ruta `/devoluciones`: cambios, devoluciones y arrepentimiento. */
export default function ReturnsRoute(): ReactNode {
  return <LegalRoute document="returns" />
}
