import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { CatalogPage, getCatalogMetadata } from '@/features/catalog'

/** Título y descripción de `/tienda`. */
export function generateMetadata(): Promise<Metadata> {
  return getCatalogMetadata(null)
}

/** Catálogo completo de la tienda (estático; el filtrado y el orden se hacen en el navegador). */
export default function ShopPage(): ReactNode {
  return <CatalogPage lineSlug={null} />
}
