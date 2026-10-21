import type { ReactNode } from 'react'
import { getCategories } from '@/lib/data/catalog'
import { SettingsProbe } from './_dev/SettingsProbe'

/** "1 producto" o "4 productos". */
function productCountLabel(count: number): string {
  return `${String(count)} ${count === 1 ? 'producto' : 'productos'}`
}

/**
 * Página de inicio provisoria: comprueba que la tienda está conectada al modo de prueba. Muestra
 * las líneas con su cantidad de productos (lectura cacheada del servidor) y el descuento del kit
 * (lectura del navegador). Se reemplaza por la portada real en P2.
 */
export default async function HomePage(): Promise<ReactNode> {
  const categories = await getCategories()
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1>Galpón Mates</h1>
      <ul>
        {categories.map((category) => (
          <li key={category.id}>
            {category.name}: {productCountLabel(category.productCount)}
          </li>
        ))}
      </ul>
      <SettingsProbe />
    </main>
  )
}
