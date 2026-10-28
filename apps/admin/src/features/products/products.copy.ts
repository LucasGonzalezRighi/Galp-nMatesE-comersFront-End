import type { ProductGroup, ProductStatus } from '@galpon/api-client'
import type { BadgeTone } from '../../components/ui/Badge'

/** Texto y tono del `Badge` de un estado. */
export interface StatusBadge {
  /** Texto del badge. */
  label: string
  /** Tono del badge. */
  tone: BadgeTone
}

/** Badge de cada estado del producto. */
export const PRODUCT_STATUS_BADGES: Readonly<Record<ProductStatus, StatusBadge>> = {
  published: { label: 'Publicado', tone: 'success' },
  draft: { label: 'Borrador', tone: 'neutral' },
  archived: { label: 'Archivado', tone: 'outline' },
}

/** Nombre de cada grupo de producto, como en Contenido › Pestañas. */
export const PRODUCT_GROUP_NAMES: Readonly<Record<ProductGroup, string>> = {
  mate: 'Mates',
  bombilla: 'Bombillas',
  yerba: 'Yerbas',
}

/** Textos de la tabla `/productos`. */
export const PRODUCTS_COPY = {
  listTitle: 'Productos',
  newProduct: 'Nuevo producto',
  filtersLabel: 'Filtros de productos',
  searchLabel: 'Buscar',
  searchPlaceholder: 'Nombre o código (N°07)',
  lineLabel: 'Línea',
  allLines: 'Todas las líneas',
  statusLabel: 'Estado',
  /** "Estado" sin elegir: la API devuelve los publicados y los borradores. */
  activeStatuses: 'Publicados y borradores',
  statusFilters: {
    published: 'Publicados',
    draft: 'Borradores',
    archived: 'Archivados',
  } satisfies Record<ProductStatus, string>,
  outOfStockOnly: 'Solo sin stock',
  clearFilters: 'Limpiar filtros',
  tableCaption: 'Productos',
  columns: {
    photo: 'Foto',
    product: 'Producto',
    line: 'Línea',
    price: 'Precio',
    stock: 'Stock',
    status: 'Estado',
    actions: 'Acciones',
  },
  featured: 'Destacado',
  onRequest: 'A consultar',
  outOfStock: 'Sin stock',
  lowStock: 'Poco stock',
  edit: 'Editar',
  viewInStore: 'Ver en la tienda',
  archive: 'Archivar',
  archiveDescription:
    'Deja de verse en la tienda y no se puede comprar. Se conserva con sus pedidos y lo podés volver a publicar.',
  archived: 'Producto archivado.',
  empty: 'Todavía no hay productos.',
  createFirst: 'Crear el primero',
  noMatches: 'Ningún producto coincide con los filtros.',
  listError: 'No pudimos cargar los productos.',
  unexpectedError: 'No pudimos completar la acción. Probá de nuevo.',
} as const

/** Textos del formulario de producto (`/productos/nuevo` y `/productos/$id`). */
export const PRODUCT_FORM_COPY = {
  newTitle: 'Nuevo producto',
  /** Título mientras carga o si no existe (todavía no hay nombre). */
  productTitle: 'Producto',
  back: 'Productos',
  loading: 'Cargando el producto…',
  loadError: 'No pudimos cargar el producto.',
  notFound: 'No encontramos ese producto.',
  backToList: 'Volver a productos',
  archivedNotice: 'Este producto está archivado: no se ve en la tienda.',
  republish: 'Volver a publicar',
  republished: 'Producto publicado de nuevo.',
  dataSection: 'Datos',
  name: 'Nombre',
  slug: 'Slug',
  line: 'Línea',
  linePlaceholder: 'Elegí una línea',
  description: 'Descripción',
  priceSection: 'Precio y stock',
  price: 'Precio',
  priceOnRequest: 'Precio a consultar (sin precio)',
  stock: 'Stock',
  featured: 'Destacado',
  featuredHint: 'Aparece en los destacados del inicio.',
  statusSection: 'Estado',
  statusHint: 'Los borradores no se ven en la tienda.',
  statusLegend: 'Estado del producto',
  draft: 'Borrador',
  published: 'Publicado',
  archived: 'Archivado',
  photosSection: 'Fotos',
  photosHint: 'Hasta 8 fotos; la primera es la principal.',
  photosList: 'Fotos del producto',
  uploadingList: 'Fotos que se están subiendo',
  alt: 'Texto alternativo',
  altHint: 'Describí la foto para quien no la ve (3 a 120 caracteres).',
  moveBefore: 'Mover antes',
  moveAfter: 'Mover después',
  tabsSection: 'Pestañas de la ficha',
  materials: 'Materiales (texto propio)',
  care: 'Cuidado (texto propio)',
  create: 'Crear producto',
  created: 'Producto creado.',
  saved: 'Cambios guardados.',
  uploadsInProgress: 'Esperá a que terminen de subir las fotos.',
  uploadsWithErrors: 'Hay fotos que no se subieron: reintentá o quitalas.',
  slugTaken: 'Ese slug ya lo usa otro producto, o lo usó antes.',
  changedTitle: 'Este producto cambió mientras lo editabas',
  changedDescription:
    'Se guardó otra versión (por ejemplo, en otra pestaña). Podés ver la versión guardada y perder tus cambios, o guardar los tuyos encima.',
  saveAnyway: 'Guardar mis cambios igual',
  viewSaved: 'Ver la versión guardada',
  unexpectedError: 'No pudimos guardar el producto. Probá de nuevo.',
} as const

/**
 * Revisa que un texto que va dentro de un mensaje no esté vacío.
 *
 * @throws {RangeError} Si está vacío o tiene solo espacios.
 */
function assertText(value: string, name: string): void {
  if (value.trim() === '') throw new RangeError(`${name} no puede estar vacío.`)
}

/**
 * Revisa que el número de una foto sea un entero desde 1.
 *
 * @throws {RangeError} Si no lo es.
 */
function assertPhotoNumber(position: number): void {
  if (!Number.isInteger(position) || position < 1) {
    throw new RangeError(
      `El número de la foto tiene que ser un entero desde 1; se recibió ${String(position)}.`,
    )
  }
}

/**
 * Título de la confirmación para archivar.
 *
 * @param name - Nombre del producto.
 * @returns "¿Archivar «{nombre}»?".
 * @throws {RangeError} Si el nombre está vacío.
 */
export function archiveTitle(name: string): string {
  assertText(name, 'El nombre del producto')
  return `¿Archivar «${name}»?`
}

/**
 * Nombre accesible del menú de acciones de una fila.
 *
 * @param name - Nombre del producto.
 * @returns "Acciones de {nombre}".
 * @throws {RangeError} Si el nombre está vacío.
 */
export function actionsLabel(name: string): string {
  assertText(name, 'El nombre del producto')
  return `Acciones de ${name}`
}

/**
 * Datos del encabezado de un producto.
 *
 * @param code - Código, por ejemplo "N°07".
 * @param createdDate - Fecha de alta ya formateada.
 * @param updatedDateTime - Fecha y hora de la última modificación ya formateadas.
 * @returns "Código {código} · Creado el {fecha} · Última modificación {fecha y hora}".
 * @throws {RangeError} Si algún dato está vacío.
 */
export function productMetaText(
  code: string,
  createdDate: string,
  updatedDateTime: string,
): string {
  assertText(code, 'El código del producto')
  assertText(createdDate, 'La fecha de alta')
  assertText(updatedDateTime, 'La fecha de modificación')
  return `Código ${code} · Creado el ${createdDate} · Última modificación ${updatedDateTime}`
}

/**
 * Ayuda del slug: la dirección del producto en la tienda.
 *
 * @param slug - Slug actual del formulario.
 * @returns "Dirección en la tienda: /producto/{slug}".
 * @throws {RangeError} Si el slug está vacío.
 */
export function slugAddressHint(slug: string): string {
  assertText(slug, 'El slug')
  return `Dirección en la tienda: /producto/${slug}`
}

/**
 * Aviso de que el slug cambia y el anterior va a redirigir.
 *
 * @param previous - Slug guardado.
 * @param next - Slug nuevo.
 * @returns "Al guardar, /producto/{viejo} va a redirigir a /producto/{nuevo}.".
 * @throws {RangeError} Si alguno está vacío.
 */
export function slugRedirectHint(previous: string, next: string): string {
  assertText(previous, 'El slug guardado')
  assertText(next, 'El slug nuevo')
  return `Al guardar, /producto/${previous} va a redirigir a /producto/${next}.`
}

/**
 * Direcciones anteriores del producto que la tienda redirige.
 *
 * @param slugs - Slugs anteriores (`previousSlugs`).
 * @returns "Direcciones anteriores que redirigen: /producto/a, /producto/b".
 * @throws {RangeError} Si la lista está vacía.
 */
export function previousSlugsHint(slugs: readonly string[]): string {
  if (slugs.length === 0) throw new RangeError('La lista de slugs anteriores está vacía.')
  return `Direcciones anteriores que redirigen: ${slugs.map((slug) => `/producto/${slug}`).join(', ')}`
}

/**
 * Nombre accesible del botón que mueve una foto un lugar antes.
 *
 * @param position - Número de la foto, desde 1.
 * @returns "Mover la foto {n} antes".
 * @throws {RangeError} Si el número no es un entero desde 1.
 */
export function movePhotoBeforeLabel(position: number): string {
  assertPhotoNumber(position)
  return `Mover la foto ${String(position)} antes`
}

/**
 * Nombre accesible del botón que mueve una foto un lugar después.
 *
 * @param position - Número de la foto, desde 1.
 * @returns "Mover la foto {n} después".
 * @throws {RangeError} Si el número no es un entero desde 1.
 */
export function movePhotoAfterLabel(position: number): string {
  assertPhotoNumber(position)
  return `Mover la foto ${String(position)} después`
}

/**
 * Nombre accesible de la agarradera de una foto.
 *
 * @param position - Número de la foto, desde 1.
 * @returns "Arrastrar la foto {n}".
 * @throws {RangeError} Si el número no es un entero desde 1.
 */
export function dragPhotoLabel(position: number): string {
  assertPhotoNumber(position)
  return `Arrastrar la foto ${String(position)}`
}

/**
 * Nombre accesible del botón que quita una foto.
 *
 * @param position - Número de la foto, desde 1.
 * @returns "Quitar la foto {n}".
 * @throws {RangeError} Si el número no es un entero desde 1.
 */
export function removePhotoLabel(position: number): string {
  assertPhotoNumber(position)
  return `Quitar la foto ${String(position)}`
}

/**
 * Ayuda de los textos propios de las pestañas.
 *
 * @param group - Nombre del grupo ("Mates"), o `null` si todavía no se eligió la línea.
 * @returns "Si lo dejás vacío, se usa el texto de {grupo} de Contenido › Pestañas.".
 * @throws {RangeError} Si el nombre del grupo está vacío.
 */
export function tabsOverrideHint(group: string | null): string {
  if (group === null)
    return 'Si lo dejás vacío, se usa el texto de su grupo de Contenido › Pestañas.'
  assertText(group, 'El nombre del grupo')
  return `Si lo dejás vacío, se usa el texto de ${group} de Contenido › Pestañas.`
}

/**
 * Texto del desplegable que muestra el texto del grupo.
 *
 * @param group - Nombre del grupo, por ejemplo "Mates".
 * @returns "Ver el texto de {grupo}".
 * @throws {RangeError} Si el nombre está vacío.
 */
export function viewGroupTextLabel(group: string): string {
  assertText(group, 'El nombre del grupo')
  return `Ver el texto de ${group}`
}
