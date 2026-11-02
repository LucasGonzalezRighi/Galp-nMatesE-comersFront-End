import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ForgotPasswordPage } from '@/features/account'

/** Título de la pestaña (lleva la plantilla "· Galpón Mates"). */
export const metadata: Metadata = { title: 'Recuperar la contraseña' }

/** Ruta `/cuenta/recuperar`: pedido del enlace para cambiar la contraseña. */
export default function ForgotPasswordRoute(): ReactNode {
  return <ForgotPasswordPage />
}
