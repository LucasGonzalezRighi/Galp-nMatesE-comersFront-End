import type { OrderStatus, PaymentMethod, PaymentStatus, ShippingMethod } from '@galpon/api-client'
import type { BadgeTone } from '../../components/ui/Badge'

/** Texto y tono del `Badge` de un estado. */
export interface StatusBadge {
  /** Texto del badge. */
  label: string
  /** Tono del badge. */
  tone: BadgeTone
}

/** Badge de cada estado del pedido. */
export const ORDER_STATUS_BADGES: Readonly<Record<OrderStatus, StatusBadge>> = {
  pending_payment: { label: 'Pendiente de pago', tone: 'neutral' },
  paid: { label: 'Pagado', tone: 'success' },
  preparing: { label: 'En preparación', tone: 'accent' },
  shipped: { label: 'Despachado', tone: 'accent' },
  delivered: { label: 'Entregado', tone: 'success' },
  cancelled: { label: 'Cancelado', tone: 'outline' },
  expired: { label: 'Vencido', tone: 'outline' },
  refunded: { label: 'Devuelto', tone: 'outline' },
}

/** Badge de cada estado del pago. */
export const PAYMENT_STATUS_BADGES: Readonly<Record<PaymentStatus, StatusBadge>> = {
  none: { label: 'Sin pago', tone: 'neutral' },
  pending: { label: 'Pendiente', tone: 'accent' },
  action_required: { label: 'Falta verificar', tone: 'accent' },
  approved: { label: 'Aprobado', tone: 'success' },
  rejected: { label: 'Rechazado', tone: 'danger' },
  cancelled: { label: 'Cancelado', tone: 'outline' },
  refunded: { label: 'Devuelto', tone: 'outline' },
  partially_refunded: { label: 'Devuelto en parte', tone: 'outline' },
  in_dispute: { label: 'En mediación', tone: 'danger' },
  charged_back: { label: 'Contracargo', tone: 'danger' },
}

/** Nombre de cada forma de envío. */
export const SHIPPING_METHOD_TEXT: Readonly<Record<ShippingMethod, string>> = {
  home: 'Envío a domicilio',
  branch: 'Envío a sucursal',
  pickup: 'Retiro en persona',
}

/** Nombre de cada forma de pago. */
export const PAYMENT_METHOD_TEXT: Readonly<Record<PaymentMethod, string>> = {
  mp_redirect: 'Mercado Pago',
  card: 'Tarjeta en la tienda',
}

/** Tipo de medio que informa Mercado Pago (`paymentTypeId`), en palabras; el resto no se muestra. */
export const PAYMENT_TYPE_TEXT: Readonly<Partial<Record<string, string>>> = {
  credit_card: 'crédito',
  debit_card: 'débito',
  account_money: 'dinero en cuenta',
}

/** Detalle del pago que informa Mercado Pago (`statusDetail`), traducido; el resto va tal cual. */
export const STATUS_DETAIL_TEXT: Readonly<Partial<Record<string, string>>> = {
  accredited: 'Acreditado',
  pending_contingency: 'En proceso',
  pending_review_manual: 'En revisión',
  cc_rejected_other_reason: 'Rechazado por el banco',
  cc_rejected_insufficient_amount: 'Fondos insuficientes',
  cc_rejected_bad_filled_security_code: 'CVC inválido',
  cc_rejected_bad_filled_date: 'Vencimiento inválido',
  cc_rejected_call_for_authorize: 'Hay que autorizarlo con el banco',
}

/** Textos fijos de las pantallas de pedidos. */
export const ORDERS_COPY = {
  listTitle: 'Pedidos',
  filtersLabel: 'Filtros de pedidos',
  searchLabel: 'Buscar',
  searchPlaceholder: 'Número, email o nombre',
  orderStatusLabel: 'Estado del pedido',
  paymentStatusLabel: 'Estado del pago',
  all: 'Todos',
  toShip: 'Para despachar (pagados y en preparación)',
  clearFilters: 'Limpiar filtros',
  tableCaption: 'Pedidos',
  columns: {
    number: 'Número',
    date: 'Fecha',
    customer: 'Cliente',
    total: 'Total',
    order: 'Pedido',
    payment: 'Pago',
    shipping: 'Envío',
  },
  empty: 'Todavía no hay pedidos.',
  emptyDescription: 'Los pedidos de la tienda aparecen acá apenas se crean.',
  viewStore: 'Ver tienda',
  noMatches: 'Ningún pedido coincide con la búsqueda.',
  listError: 'No pudimos cargar los pedidos.',
  back: 'Pedidos',
  detailError: 'No pudimos cargar el pedido.',
  /** Aviso oculto (`role="status"`) mientras carga el detalle. */
  detailLoading: 'Cargando el pedido…',
  backToList: 'Volver a pedidos',
  chargedBack: 'Contracargo: el cliente desconoció el pago en su banco. Revisalo en Mercado Pago.',
  inDispute: 'Mediación abierta en Mercado Pago: respondé desde Mercado Pago.',
  sections: {
    customer: 'Cliente',
    shipping: 'Envío',
    lines: 'Productos',
    totals: 'Totales',
    payment: 'Pago',
    history: 'Historial',
  },
  customer: { name: 'Nombre', email: 'Email', phone: 'Teléfono' },
  noPhone: '—',
  shipping: {
    method: 'Método',
    address: 'Dirección',
    cost: 'Costo',
    eta: 'Plazo',
    tracking: 'Seguimiento',
  },
  noAddress: 'Sin dirección (retiro en persona)',
  free: 'Gratis',
  kitPieces: 'Piezas del kit',
  totals: {
    items: 'Productos',
    kitSavings: 'Ahorro por kit',
    subtotal: 'Subtotal',
    shipping: 'Envío',
    total: 'Total',
  },
  payment: {
    status: 'Estado',
    detail: 'Detalle',
    method: 'Medio',
    card: 'Tarjeta',
    installments: 'Cuotas',
    mpId: 'ID de Mercado Pago',
  },
  viewInMercadoPago: 'Ver en Mercado Pago',
  newTab: '(se abre en otra pestaña)',
  refundsNote: 'Las devoluciones se hacen desde Mercado Pago.',
  actions: {
    prepare: 'Pasar a preparación',
    /** "Pasar a preparación" mientras se guarda. */
    preparing: 'Pasando a preparación…',
    prepared: 'El pedido pasó a preparación.',
    ship: 'Marcar como despachado',
    shipped: 'Pedido despachado.',
    carrier: 'Empresa de envío',
    carrierPlaceholder: 'Andreani',
    trackingNumber: 'Número de seguimiento',
    note: 'Nota (opcional)',
    deliver: 'Marcar como entregado',
    deliverDescription: 'Confirmá que el cliente recibió el pedido.',
    delivered: 'Pedido entregado.',
    cancel: 'Cancelar pedido',
    cancelDescription:
      'Se libera el stock reservado y el pedido queda cancelado. No se puede deshacer.',
    cancelBack: 'Volver',
    cancelled: 'Pedido cancelado.',
    dismiss: 'Cancelar',
    saving: 'Guardando…',
    paymentInProgress: 'Hay un pago en curso: esperá a que se resuelva para cancelarlo.',
    none: 'No hay acciones para este estado.',
    unexpectedError: 'No pudimos cambiar el estado del pedido. Probá de nuevo.',
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
 * Título de la pantalla de un pedido.
 *
 * @param number - Número del pedido.
 * @returns "Pedido {número}".
 * @throws {RangeError} Si el número está vacío.
 */
export function orderTitle(number: string): string {
  assertText(number, 'El número del pedido')
  return `Pedido ${number}`
}

/**
 * Fecha de creación de un pedido, ya formateada.
 *
 * @param dateTime - Fecha y hora, por ejemplo "27/10/2026 11:54".
 * @returns "Creado el {fecha y hora}".
 * @throws {RangeError} Si la fecha está vacía.
 */
export function createdAtText(dateTime: string): string {
  assertText(dateTime, 'La fecha del pedido')
  return `Creado el ${dateTime}`
}

/**
 * Hasta cuándo se reserva el stock de un pedido que espera el pago.
 *
 * @param time - Hora, por ejemplo "12:20".
 * @returns "Reserva de stock hasta las {hora}".
 * @throws {RangeError} Si la hora está vacía.
 */
export function reservedUntilText(time: string): string {
  assertText(time, 'La hora de la reserva')
  return `Reserva de stock hasta las ${time}`
}

/**
 * Título del diálogo de despacho.
 *
 * @param number - Número del pedido.
 * @returns "Despachar el pedido {número}".
 * @throws {RangeError} Si el número está vacío.
 */
export function shipTitle(number: string): string {
  assertText(number, 'El número del pedido')
  return `Despachar el pedido ${number}`
}

/**
 * Pregunta del diálogo de entrega.
 *
 * @param number - Número del pedido.
 * @returns "¿Marcar {número} como entregado?".
 * @throws {RangeError} Si el número está vacío.
 */
export function deliverTitle(number: string): string {
  assertText(number, 'El número del pedido')
  return `¿Marcar ${number} como entregado?`
}

/**
 * Pregunta del diálogo de cancelación.
 *
 * @param number - Número del pedido.
 * @returns "¿Cancelar el pedido {número}?".
 * @throws {RangeError} Si el número está vacío.
 */
export function cancelTitle(number: string): string {
  assertText(number, 'El número del pedido')
  return `¿Cancelar el pedido ${number}?`
}

/**
 * Mensaje de un pedido que no existe.
 *
 * @param number - Número pedido en la dirección.
 * @returns "No encontramos el pedido {número}.".
 * @throws {RangeError} Si el número está vacío.
 */
export function orderNotFound(number: string): string {
  assertText(number, 'El número del pedido')
  return `No encontramos el pedido ${number}.`
}

/**
 * Últimos dígitos de la tarjeta.
 *
 * @param lastFour - Los 4 dígitos.
 * @returns "Terminada en {4 dígitos}".
 * @throws {RangeError} Si no son 4 dígitos.
 */
export function lastFourText(lastFour: string): string {
  if (!/^\d{4}$/.test(lastFour)) {
    throw new RangeError(`La tarjeta tiene que traer 4 dígitos; se recibió "${lastFour}".`)
  }
  return `Terminada en ${lastFour}`
}

/**
 * Cantidad de cuotas del pago.
 *
 * @param installments - Cuotas, un entero mayor a 0.
 * @returns "1 cuota" o "{n} cuotas".
 * @throws {RangeError} Si no es un entero mayor a 0.
 */
export function installmentsText(installments: number): string {
  if (!Number.isInteger(installments) || installments < 1) {
    throw new RangeError(
      `Las cuotas tienen que ser un entero mayor a 0; se recibió ${String(installments)}.`,
    )
  }
  return installments === 1 ? '1 cuota' : `${String(installments)} cuotas`
}

/**
 * Seguimiento de un despacho.
 *
 * @param carrier - Empresa de envío.
 * @param trackingNumber - Número de seguimiento.
 * @returns "{empresa} · {número}".
 * @throws {RangeError} Si alguno está vacío.
 */
export function trackingText(carrier: string, trackingNumber: string): string {
  assertText(carrier, 'La empresa de envío')
  assertText(trackingNumber, 'El número de seguimiento')
  return `${carrier} · ${trackingNumber}`
}

/**
 * Cuero y virola elegidos en una línea.
 *
 * @param leather - Cuero, por ejemplo "Negro".
 * @param ferrule - Virola, por ejemplo "Alpaca cincelada".
 * @returns "Cuero {x} · Virola {y}".
 * @throws {RangeError} Si alguno está vacío.
 */
export function lineOptionsText(leather: string, ferrule: string): string {
  assertText(leather, 'El cuero')
  assertText(ferrule, 'La virola')
  return `Cuero ${leather} · Virola ${ferrule}`
}

/**
 * Cantidad y precio unitario de una línea.
 *
 * @param quantity - Unidades, un entero mayor a 0.
 * @param unitPrice - Precio de una unidad, ya formateado.
 * @returns "{cantidad} × {precio}".
 * @throws {RangeError} Si la cantidad no es un entero mayor a 0 o el precio está vacío.
 */
export function quantityTimesPrice(quantity: number, unitPrice: string): string {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new RangeError(
      `La cantidad tiene que ser un entero mayor a 0; se recibió ${String(quantity)}.`,
    )
  }
  assertText(unitPrice, 'El precio')
  return `${String(quantity)} × ${unitPrice}`
}
