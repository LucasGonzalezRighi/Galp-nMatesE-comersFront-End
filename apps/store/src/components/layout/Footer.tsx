import type { ReactNode } from 'react'
import { getCategories } from '../../lib/data/catalog'
import { getFooterContent } from '../../lib/data/layout'
import { getPublicSettings } from '../../lib/data/settings'
import { FooterView } from './FooterView'

/**
 * Pie de página de todas las páginas: trae los textos del pie, los ajustes públicos y las líneas
 * (lecturas cacheadas del servidor) y los dibuja con {@link FooterView}.
 *
 * @throws {ApiError} Si la API falla al leer alguno de los datos.
 */
export async function Footer(): Promise<ReactNode> {
  const [content, settings, categories] = await Promise.all([
    getFooterContent(),
    getPublicSettings(),
    getCategories(),
  ])
  return <FooterView content={content} settings={settings} categories={categories} />
}
