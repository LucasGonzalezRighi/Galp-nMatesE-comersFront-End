import type { ReactNode } from 'react'
import { getHomeData } from './home.data'
import { HomeCollection } from './HomeCollection'
import { HomeFeatured } from './HomeFeatured'
import { HomeHero } from './HomeHero'
import { HomeKit } from './HomeKit'
import { HomeManifesto } from './HomeManifesto'
import { HomeReviews } from './HomeReviews'
import { HomeStats } from './HomeStats'
import { HomeStory } from './HomeStory'
import './home.css'

/**
 * Inicio de la tienda (Server Component, spec 9.5): lee todo en el servidor con lecturas
 * cacheadas (`getHomeData`) y arma las secciones en orden: portada, historia de seis escenas,
 * colección horizontal, destacados, manifiesto, cifras, bloque del kit y reseñas. Así la página
 * es estática y se regenera cuando el backend invalida las etiquetas de caché.
 *
 * @throws {ApiError} Si la API falla.
 */
export async function HomePage(): Promise<ReactNode> {
  const data = await getHomeData()
  return (
    <main>
      <HomeHero data={data} />
      {/* La historia es un Client Component: recibe solo lo que usa, no todos los datos del inicio. */}
      <HomeStory
        data={{ content: data.content, story: data.story, stats: data.stats, lines: data.lines }}
      />
      <HomeCollection data={data} />
      <HomeFeatured data={data} />
      <HomeManifesto data={data} />
      <HomeStats data={data} />
      <HomeKit data={data} />
      <HomeReviews data={data} />
    </main>
  )
}
