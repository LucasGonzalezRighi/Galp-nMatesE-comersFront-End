import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getProductMetadata, getProductParams, ProductPage } from '@/features/product'

/** Props de la página: Next.js entrega los parámetros de la dirección como una promesa. */
interface ProductRouteProps {
  /** Parámetros de la dirección: el slug del producto. */
  params: Promise<{ slug: string }>
}

/**
 * Cada ficha es una página estática completa. La página lee el slug fuera de `<Suspense>` (con él
 * decide `notFound` o `permanentRedirect`), así que la App Shell de la ruta, con el slug sin
 * resolver, queda vacía. Con Partial Prefetching, `next start` servía una ficha vencida (las
 * etiquetas se regeneran con `expire: 0`) a través de esa App Shell; si también había vencido
 * (`categories` y `settings` los lee el pie del layout), la regeneraba, la rechazaba por vacía y la
 * ficha quedaba en 500 hasta reiniciar. Con `'navigation'`, una ficha vencida o nueva se regenera
 * bloqueando con el slug resuelto, tanto la carga como la navegación del cliente, un slug
 * desconocido sale 404 desde el primer pedido, y el build falla si la ficha lee datos sin caché o
 * del pedido.
 */
export const ensureStatic = 'navigation'

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
