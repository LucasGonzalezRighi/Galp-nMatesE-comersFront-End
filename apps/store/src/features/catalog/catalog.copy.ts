import type { ProductSortOrder } from '@galpon/domain'

/** Microtextos del catálogo de la tienda, tal como están en el diseño (`body.html`, pantalla Tienda). */
export const CATALOG_COPY = {
  /** Sobretítulo de la página. */
  eyebrow: 'Tienda',
  /** Título de la página sin línea elegida. */
  allTitle: 'Todo el catálogo',
  /** Bajada de la página sin línea elegida. */
  allBlurb: 'Mates, bombillones y yerba. Elegí, sumá al carrito y pagá online.',
  /** Botón que muestra todas las líneas. */
  allLines: 'Todos',
  /** Nombre accesible del grupo de botones de línea. */
  linesNav: 'Líneas de producto',
  /** Texto de ayuda del buscador. */
  searchPlaceholder: 'Buscar en la tienda…',
  /** Nombre accesible del buscador. */
  searchLabel: 'Buscar en la tienda',
  /** Nombre accesible de la lista de orden. */
  sortLabel: 'Ordenar',
  /** Opciones de orden. */
  sortOptions: {
    destacados: 'Destacados',
    menor: 'Menor precio',
    mayor: 'Mayor precio',
    az: 'A – Z',
  } satisfies Record<ProductSortOrder, string>,
  /** Estado vacío de una búsqueda sin coincidencias. */
  noResults: (query: string): string => `No encontramos resultados para “${query}”.`,
  /** Botón que borra la búsqueda. */
  clearSearch: 'Limpiar búsqueda',
  /** Línea sin productos publicados. */
  emptyLine: 'Todavía no hay piezas en esta línea.',
  /** Enlace de la línea vacía hacia todo el catálogo. */
  emptyLineLink: 'Ver toda la tienda',
  /** Catálogo sin productos publicados. */
  emptyShop: 'Todavía no hay piezas en la tienda.',
  /** Título de la banda final hacia el kit. */
  kitTitle: '¿Ya elegiste el mate? Sumale bombilla y yerba.',
  /** Bajada de la banda final; `discount` viene formateado (por ejemplo "−10%"). */
  kitSubtitle: (discount: string): string => `Armando el kit tenés ${discount} sobre el total.`,
  /** Botón de la banda final. */
  kitCta: 'Armar mi kit',
} as const
