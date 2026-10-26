import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getProductMetadata, getProductParams, ProductPage } from '@/features/product'

/** Props de la página: Next.js entrega los parámetros de la dirección como una promesa. */
interface ProductRouteProps {
  /** Parámetros de la dirección: el slug del producto. */
  params: Promise<{ slug: string }>
}

/** Una página estática por producto publicado; uno nuevo se genera la primera vez que se pide. */
export function generateStaticParams(): Promise<{ slug: string }[]> {
  return getProductParams()
}

/**
 * Metadatos de la ficha: título, descripción, dirección canónica y datos para compartir.
 *
 * @param props - Ver {@link ProductRouteProps}.
 */
export async function generateMetadata({ params }: ProductRouteProps): Promise<Metadata> {
  const { slug } = await params
  return await getProductMetadata(slug)
}

/**
 * Ficha de un producto (`/producto/mate-imperial-premium`). Un slug inválido o inexistente responde
 * `notFound()`; uno anterior redirige con `permanentRedirect` al actual.
 *
 * @param props - Ver {@link ProductRouteProps}.
 */
export default async function ProductRoute({ params }: ProductRouteProps): Promise<ReactNode> {
  const { slug } = await params
  return <ProductPage slug={slug} />
}
