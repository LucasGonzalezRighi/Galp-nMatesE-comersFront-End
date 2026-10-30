import type { ReactNode } from 'react'

/**
 * La yerba vista desde adentro del mate, a pantalla completa (la zambullida, Ruling MR-22): la foto
 * real de la yerba (`/hero/3d/yerba-albedo.jpg`, la misma textura del mate 3D, que ya está en la
 * caché del navegador) en mosaico, girada como en la escena para que no se lean las rosetas del
 * espejado, con el tinte de la escena y una viñeta oscura en los bordes (`.home-yerba-depth` en
 * `home.css`). Es decorativa. Es el último cuadro del escenario del mate (`MateStage`) y el primero
 * de la colección (`CollectionEntrance`): las dos capas se ven iguales, así el cambio no se nota.
 */
export function YerbaDepth(): ReactNode {
  return (
    <div aria-hidden="true" data-yerba-depth="" className="home-yerba-depth">
      <div className="home-yerba-depth-photo" />
      <div className="home-yerba-depth-vignette" />
    </div>
  )
}
