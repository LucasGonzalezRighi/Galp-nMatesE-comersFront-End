import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ResetPasswordPage } from '@/features/account'

/** Título de la pestaña (lleva la plantilla "· Galpón Mates"). */
export const metadata: Metadata = { title: 'Elegir una contraseña nueva' }

/** Ruta `/cuenta/restablecer`: contraseña nueva con el código del enlace (`?token=`). */
export default function ResetPasswordRoute(): ReactNode {
  return <ResetPasswordPage />
}
