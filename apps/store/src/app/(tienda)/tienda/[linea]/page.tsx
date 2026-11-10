import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { CatalogPage, getCatalogLineParams, getCatalogMetadata } from '@/features/catalog'

/** Props de la página: Next.js entrega los parámetros de la dirección como una promesa. */
interface ShopLinePageProps {
  /** Parámetros de la dirección: el slug de la línea. */
  params: Promise<{ linea: string }>
}

/**
 * Cada línea es una página estática completa: una vencida o nueva se regenera bloqueando, con el
 * slug resuelto, y no a través de la App Shell vacía de la ruta. Sin esto, regenerar `categories`
 * o `settings` la dejaba en 500 hasta reiniciar `next start` (el motivo está en la ficha de
 * producto, `producto/[slug]/page.tsx`).
 */
export const ensureStatic = 'navigation'

/** Una página estática por línea (con una de relleno que responde `notFound()` si no hay ninguna). */
export function generateStaticParams(): Promise<{ linea: string }[]> {
  return getCatalogLineParams()
}

/**
 * Título y descripción de la línea.
 *
 * @param props - Ver {@link ShopLinePageProps}.
 */
export async function generateMetadata({ params }: ShopLinePageProps): Promise<Metadata> {
  const { linea } = await params
  return await getCatalogMetadata(linea)
}

/**
 * Catálogo de una línea (`/tienda/imperiales`): lo mismo que `/tienda` con el título y la bajada de
 * la línea y solo sus productos. Una línea que no existe responde `notFound()`.
 *
 * @param props - Ver {@link ShopLinePageProps}.
 */
export default async function ShopLinePage({ params }: ShopLinePageProps): Promise<ReactNode> {
  const { linea } = await params
  return <CatalogPage lineSlug={linea} />
}
