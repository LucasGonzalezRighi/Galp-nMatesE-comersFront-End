import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { RegisterPage } from '@/features/account'

/** Título de la pestaña (lleva la plantilla "· Galpón Mates"). */
export const metadata: Metadata = { title: 'Crear cuenta' }

/** Ruta `/cuenta/registro`: alta de cuenta. */
export default function RegisterRoute(): ReactNode {
  return <RegisterPage />
}
