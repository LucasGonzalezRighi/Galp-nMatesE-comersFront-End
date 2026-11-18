/**
 * Contenedor del inicio: la utilidad `site-container` de `globals.css`, la misma de toda la tienda
 * (1600 px como máximo, centrado, con 20 a 64 px de margen lateral).
 */
export const HOME_CONTAINER = 'site-container'

/** Título de sección del inicio (colección, destacados, kit, reseñas). */
export const HOME_SECTION_TITLE = 'text-[clamp(32px,4.4vw,58px)] leading-[1.04] tracking-[-0.03em]'

/**
 * Tamaño de los títulos de las paradas del mate 3D, el `h1` de la portada y los `h2` (Ruling AI-4):
 * escala con el ancho y el alto (`--story-title-lg` de `.home-stop`) y se queda en 68 px para que
 * el renglón más largo ("Encontrá tu mate.", 7,48 em) entre en la columna de 520 px sin cortarse.
 */
export const HOME_STAGE_TITLE_SIZE = 'text-[clamp(44px,var(--story-title-lg,6.4vw),68px)]'

/** Párrafo de las escenas de la historia y del bloque del kit. */
export const HOME_SCENE_TEXT = 'max-w-[40ch] text-[clamp(16px,1.3vw,19px)] leading-[1.6]'

/** Flecha de los botones y links, de 15 px. */
export const HOME_ARROW_SIZE = 15

/** Botón redondo de las escenas: la forma de píldora y el halo cobrizo del diseño. */
export const HOME_PILL_BUTTON = 'rounded-full! shadow-[0_0_40px_-12px_var(--color-accent)]'
