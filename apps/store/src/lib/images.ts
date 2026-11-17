import type { NextConfig } from 'next'

/**
 * Configuración del optimizador de imágenes de Next (`images` de `next.config.ts`), acotada a lo
 * que muestra la tienda. `/_next/image` lo puede pedir cualquiera y cada combinación nueva de
 * `url`, ancho y calidad deja un archivo en `.next/cache/images`, así que:
 *
 * - **Patrones locales:** solo las rutas que pasan por `next/image` (el matecito de la marca, las
 *   fotos del inicio y las de los productos de ejemplo), sin búsqueda (`?v=1` sería otra entrada
 *   del caché para el mismo archivo) y con nombres de minúsculas, números y guiones, así un nombre
 *   con `%` codificado tampoco pasa.
 * - **Anchos:** los de `next/image` por omisión hasta 1920 px, la foto local más ancha; más grande
 *   repetía la misma imagen en otra entrada del caché. Sin 48, que ningún tamaño de la tienda pide.
 * - **Calidad:** solo 75, la que usa `next/image` cuando no se le pasa otra.
 * - **Caché de disco:** hasta 256 MB. Next compara el patrón con la ruta ya normalizada, así que un
 *   alias con fragmento (`#x`), con `?` vacío o con `..` sigue pasando; el tope acota lo que pueden ocupar.
 */
export const STORE_IMAGES = {
  deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  imageSizes: [32, 64, 96, 128, 256, 384],
  qualities: [75],
  localPatterns: [
    { pathname: '/brand/galpon-mark.png', search: '' },
    { pathname: '/hero/world/+([a-z0-9-]).jpg', search: '' },
    { pathname: '/mock-images/+([a-z0-9-]).jpg', search: '' },
  ],
  maximumDiskCacheSize: 256 * 1024 * 1024,
} satisfies NonNullable<NextConfig['images']>
