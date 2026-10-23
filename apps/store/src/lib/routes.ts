import type { Route } from 'next'

/**
 * Convierte una ruta de la tienda en el tipo `Route` que pide `<Link>` con `typedRoutes`.
 *
 * Los tipos de las rutas se generan de las carpetas de `app/`, así que una ruta que todavía no
 * tiene su página (o una armada con un slug) no pasa el chequeo como literal. Esta función es el
 * único lugar donde se afirma que el texto es una ruta de la tienda.
 *
 * @param path - Ruta interna: empieza con `/` y puede llevar `?consulta` o `#ancla`.
 * @returns La misma ruta, con el tipo `Route`.
 * @throws {RangeError} Si no empieza con `/` o empieza con `//` (sería otro sitio, no una ruta interna).
 * @example
 * <Link href={asRoute(`/producto/${product.slug}`)}>Ver detalle</Link>
 */
export function asRoute(path: string): Route {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new RangeError(
      `La ruta tiene que ser interna: empezar con "/" y no con "//"; se recibió ${JSON.stringify(path)}.`,
    )
  }
  return path as Route
}
