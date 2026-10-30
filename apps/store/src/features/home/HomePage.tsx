import type { ReactNode } from 'react'
import { HomeIntro } from '../intro'
import { FooterStage } from './FooterStage'
import { getHomeData } from './home.data'
import { HomeCollection } from './HomeCollection'
import { HomeFeatured } from './HomeFeatured'
import { HomeHero } from './HomeHero'
import { HomeKit } from './HomeKit'
import { HomeManifesto } from './HomeManifesto'
import { HomeReviews } from './HomeReviews'
import { HomeStats } from './HomeStats'
import { HomeStory } from './HomeStory'
import { PinnedManifesto } from './PinnedManifesto'
import './home.css'

/**
 * Inicio de la tienda (Server Component, spec 9.5): lee todo en el servidor con lecturas
 * cacheadas (`getHomeData`) y arma las secciones en orden: portada y escenas de la bombilla y del
 * agua (en escritorio, el mate 3D de tres paradas), colección horizontal, destacados, manifiesto
 * con las cifras abajo (en escritorio, una pantalla clavada sobre el yerbal), bloque del kit (que
 * sube por encima de esa pantalla) y reseñas (en escritorio, quietas mientras el pie sube por
 * encima). Primero va la intro (`HomeIntro`, Ruling MR-29): el matecito y GALPÓN se dibujan y la
 * pantalla se abre como un libro cada vez que se muestra el inicio. Así la página es estática y se
 * regenera cuando el backend invalida las etiquetas de caché.
 *
 * @throws {ApiError} Si la API falla.
 */
export async function HomePage(): Promise<ReactNode> {
  const data = await getHomeData()
  const reviews = <HomeReviews data={data} />
  return (
    <main>
      <HomeIntro />
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
      <PinnedManifesto
        manifesto={<HomeManifesto data={data} />}
        stats={<HomeStats data={data} />}
        kit={<HomeKit data={data} />}
      />
      {/* Sin reseñas no hay nada que dejar quieto: el pie va debajo, como en las demás páginas. */}
      {data.reviews.length === 0 ? reviews : <FooterStage>{reviews}</FooterStage>}
    </main>
  )
}
