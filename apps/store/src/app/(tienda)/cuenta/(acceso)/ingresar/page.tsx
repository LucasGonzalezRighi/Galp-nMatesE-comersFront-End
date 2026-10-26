import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { LoginPage } from '@/features/account'

/** Título de la pestaña (lleva la plantilla "· Galpón Mates"). */
export const metadata: Metadata = { title: 'Ingresar' }

/** Ruta `/cuenta/ingresar`: ingreso de clientes. */
export default function LoginRoute(): ReactNode {
  return <LoginPage />
}
