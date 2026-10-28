import { MAX_IMAGES } from '@galpon/domain'

/** Productos por página del listado `/productos`. */
export const PRODUCTS_PAGE_SIZE = 24

/** Espera desde la última tecla de "Buscar" hasta cambiar la URL, en milisegundos. */
export const PRODUCTS_SEARCH_DEBOUNCE_MS = 300

/** Largo máximo del texto de "Buscar" (el mismo que acepta `GET /admin/products`). */
export const PRODUCTS_SEARCH_MAX_LENGTH = 100

/** Cupo de fotos de un producto (`MAX_IMAGES.product` del dominio). */
export const MAX_PRODUCT_PHOTOS = MAX_IMAGES.product

/** Largo máximo del nombre (el de `productFormSchema`). */
export const PRODUCT_NAME_MAX_LENGTH = 120

/** Largo máximo de la descripción (el de `productFormSchema`). */
export const PRODUCT_DESCRIPTION_MAX_LENGTH = 2000

/** Largo máximo del texto propio de cada pestaña (el de `productFormSchema`). */
export const PRODUCT_TAB_TEXT_MAX_LENGTH = 2000

/** Largo máximo del texto alternativo de una foto (el de `imageFormSchema`). */
export const PHOTO_ALT_MAX_LENGTH = 120
