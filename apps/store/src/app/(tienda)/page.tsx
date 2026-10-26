import type { ReactNode } from 'react'
import { HomePage } from '@/features/home'

/** Inicio de la tienda (estático; se regenera cuando el backend invalida el caché). */
export default function Page(): ReactNode {
  return <HomePage />
}
