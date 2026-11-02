import type { MetadataRoute } from 'next'
import { getStoreEnv } from '@/lib/env'
import { buildRobots } from '@/lib/seo'

/** `/robots.txt`: sitio abierto salvo la API y las páginas privadas, con la dirección del sitemap. */
export default function robots(): MetadataRoute.Robots {
  return buildRobots(getStoreEnv().siteUrl)
}
