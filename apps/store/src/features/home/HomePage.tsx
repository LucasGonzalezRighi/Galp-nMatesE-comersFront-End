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
import { PinnedStats } from './PinnedStats'
import './home.css'

/**
 * Inicio de la tienda (Server Component, spec 9.5): lee todo en el servidor con lecturas
 * cacheadas (`getHomeData`) y arma las secciones en orden: portada y escenas de la bombilla y del
 * agua (en escritorio, el mate 3D de tres paradas), colección horizontal, destacados, manifiesto,
 * cifras, bloque del kit (que en escritorio sube por encima de las cifras clavadas) y reseñas. Así
 * la página es estática y se regenera cuando el backend invalida las etiquetas de caché.
 *
 * @throws {ApiError} Si la API falla.
 */
export async function HomePage(): Promise<ReactNode> {
  const data = await getHomeData()
  return (
    <main>
      {/* La historia es un Client Component: recibe la portada ya dibujada y solo los datos que usa. */}
      <HomeStory
        hero={<HomeHero data={data} />}
        data={{
          content: data.content,
          story: data.story,
          lines: data.lines,
          kitDiscountLabel: data.kitDiscountLabel,
        }}
      />
      <HomeCollection data={data} />
      <HomeFeatured data={data} />
      <HomeManifesto data={data} />
      <PinnedStats stats={<HomeStats data={data} />} kit={<HomeKit data={data} />} />
      <HomeReviews data={data} />
    </main>
  )
}
