import type { ProductGroup } from '@galpon/domain'

/** Textos de la pantalla de líneas y de sus diálogos. */
export const CATEGORIES_COPY = {
  title: 'Líneas',
  description: 'Arrastrá para cambiar el orden en que se muestran en la tienda.',
  newCategory: 'Nueva línea',
  /** Nombre de la lista reordenable (y comienzo del anuncio del orden). */
  listLabel: 'Líneas',
  loading: 'Cargando las líneas…',
  loadError: 'No pudimos cargar las líneas.',
  empty: 'Todavía no hay líneas.',
  emptyAction: 'Crear la primera',
  /** Nombre de cada grupo de productos, como se ve en la lista y en el formulario. */
  groups: {
    mate: 'Mates',
    bombilla: 'Bombillas',
    yerba: 'Yerbas',
  } satisfies Record<ProductGroup, string>,
  actions: {
    edit: 'Editar',
    delete: 'Borrar',
  },
  order: {
    saved: 'Orden guardado.',
    failed: 'No pudimos guardar el orden. Volvimos al anterior.',
  },
  form: {
    createTitle: 'Nueva línea',
    editTitle: 'Editar línea',
    name: 'Nombre',
    slug: 'Slug',
    group: 'Grupo',
    blurb: 'Bajada',
    blurbHint: 'Texto corto que acompaña la línea (hasta 200).',
    photo: 'Foto',
    alt: 'Texto alternativo',
    altHint: 'Describí la foto para quien no la ve (3 a 120 caracteres).',
    /** Se intenta guardar con una foto subiendo o con error. */
    photoPending: 'Esperá a que termine de subir la foto, o quitala si falló.',
    save: 'Guardar',
    saving: 'Guardando…',
    cancel: 'Cancelar',
    created: 'Línea creada.',
    updated: 'Cambios guardados.',
    slugTaken: 'Ese slug ya lo usa otra línea.',
    saveError: 'No pudimos guardar la línea. Probá de nuevo.',
  },
  discard: {
    title: '¿Descartar los cambios?',
    description: 'Lo que cambiaste en esta línea no se guarda.',
    confirm: 'Descartar',
    keepEditing: 'Seguir editando',
  },
  remove: {
    description: 'Solo se puede borrar una línea sin productos (contando borradores y archivados).',
    confirm: 'Borrar',
    hasProducts: 'La línea tiene productos. Movelos a otra línea antes de borrarla.',
    deleted: 'Línea borrada.',
    error: 'No pudimos borrar la línea. Probá de nuevo.',
  },
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
 * Nombre de la agarradera de una línea.
 *
 * @param name - Nombre de la línea.
 * @returns "Arrastrar {nombre}".
 * @throws {RangeError} Si el nombre está vacío.
 */
export function dragLabel(name: string): string {
  assertText(name, 'El nombre de la línea')
  return `Arrastrar ${name}`
}

/**
 * Nombre del botón que sube una línea un lugar.
 *
 * @param name - Nombre de la línea.
 * @returns "Subir {nombre}".
 * @throws {RangeError} Si el nombre está vacío.
 */
export function moveUpLabel(name: string): string {
  assertText(name, 'El nombre de la línea')
  return `Subir ${name}`
}

/**
 * Nombre del botón que baja una línea un lugar.
 *
 * @param name - Nombre de la línea.
 * @returns "Bajar {nombre}".
 * @throws {RangeError} Si el nombre está vacío.
 */
export function moveDownLabel(name: string): string {
  assertText(name, 'El nombre de la línea')
  return `Bajar ${name}`
}

/**
 * Nombre del menú de acciones de una línea.
 *
 * @param name - Nombre de la línea.
 * @returns "Acciones de {nombre}".
 * @throws {RangeError} Si el nombre está vacío.
 */
export function actionsLabel(name: string): string {
  assertText(name, 'El nombre de la línea')
  return `Acciones de ${name}`
}

/**
 * Dirección de la línea en la tienda, como se muestra debajo del nombre.
 *
 * @param slug - Slug de la línea.
 * @returns "/tienda/{slug}".
 * @throws {RangeError} Si el slug está vacío.
 */
export function storePath(slug: string): string {
  assertText(slug, 'El slug de la línea')
  return `/tienda/${slug}`
}

/**
 * Cantidad de productos publicados de la línea.
 *
 * @param count - Productos publicados (entero, 0 o más).
 * @returns "1 publicado" o "{n} publicados".
 * @throws {RangeError} Si `count` no es un entero mayor o igual a 0.
 */
export function publishedCount(count: number): string {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError(
      `La cantidad de publicados tiene que ser un entero desde 0; se recibió ${String(count)}.`,
    )
  }
  return count === 1 ? '1 publicado' : `${String(count)} publicados`
}

/**
 * Pregunta del diálogo para borrar una línea.
 *
 * @param name - Nombre de la línea.
 * @returns "¿Borrar la línea «{nombre}»?".
 * @throws {RangeError} Si el nombre está vacío.
 */
export function deleteTitle(name: string): string {
  assertText(name, 'El nombre de la línea')
  return `¿Borrar la línea «${name}»?`
}
