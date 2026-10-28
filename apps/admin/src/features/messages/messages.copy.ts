import type { ContactMessageKind } from '@galpon/api-client'

/** Textos de la pantalla de mensajes. */
export const MESSAGES_COPY = {
  title: 'Mensajes',
  /** Nombre accesible de la lista de pestañas. */
  tabsLabel: 'Tipo de mensaje',
  tabs: {
    todos: 'Todos',
    contacto: 'Contacto',
    arrepentimiento: 'Arrepentimientos',
  },
  onlyUnread: 'Solo sin leer',
  /** Nombre accesible de la lista de mensajes. */
  listLabel: 'Mensajes',
  /** Aviso oculto (`role="status"`) mientras carga la lista. */
  loading: 'Cargando los mensajes…',
  /** Texto oculto junto al punto de los mensajes sin leer. */
  unread: 'Sin leer',
  kinds: {
    contact: 'Contacto',
    withdrawal: 'Arrepentimiento',
  } satisfies Record<ContactMessageKind, string>,
  /** Antes del número de pedido en el resumen ("Pedido GLP-09002"). */
  order: 'Pedido',
  reply: 'Responder por email',
  /** Antes del número de pedido en el enlace ("Ver pedido GLP-09002"). */
  viewOrder: 'Ver pedido',
  noComment: 'Sin comentario.',
  markUnread: 'Marcar como no leído',
  markedUnread: 'Mensaje marcado como no leído.',
  empty: 'No hay mensajes.',
  emptyFiltered: 'No hay mensajes con estos filtros.',
  clearFilters: 'Limpiar filtros',
  /** Acción del vacío de una página que ya no tiene mensajes. */
  firstPage: 'Ir a la primera página',
  loadError: 'No pudimos cargar los mensajes.',
  /** Aviso cuando un cambio falla sin un mensaje de la API. */
  saveError: 'No pudimos guardar el cambio. Probá de nuevo.',
  /** Asunto de la respuesta a un mensaje de contacto. */
  contactSubject: 'Tu consulta a Galpón Mates',
} as const

/**
 * Valida que el código de un arrepentimiento no esté vacío.
 *
 * @throws {RangeError} Si está vacío.
 */
function assertCode(code: string): void {
  if (code.trim() === '') {
    throw new RangeError('El código del arrepentimiento no puede estar vacío.')
  }
}

/**
 * Código de un arrepentimiento, como va en el resumen del mensaje.
 *
 * @param code - Código del comprobante.
 * @returns Por ejemplo "Código ARR-000001".
 * @throws {RangeError} Si el código está vacío.
 */
export function withdrawalCodeLabel(code: string): string {
  assertCode(code)
  return `Código ${code}`
}

/**
 * Asunto de la respuesta a una solicitud de arrepentimiento.
 *
 * @param code - Código del comprobante.
 * @returns Por ejemplo "Tu solicitud de arrepentimiento ARR-000001".
 * @throws {RangeError} Si el código está vacío.
 */
export function withdrawalSubject(code: string): string {
  assertCode(code)
  return `Tu solicitud de arrepentimiento ${code}`
}
