import type { MetadataRoute } from 'next'
import { buildManifest } from '@/lib/seo'

/** `/manifest.webmanifest`: nombre, colores e ícono de la tienda como aplicación web. */
export default function manifest(): MetadataRoute.Manifest {
  return buildManifest()
}
