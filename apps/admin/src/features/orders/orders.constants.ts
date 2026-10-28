/**
 * Enlace a un pago en la actividad de Mercado Pago; `{id}` se reemplaza por `mpPaymentId`.
 *
 * A confirmar con la cuenta real (pregunta 4 del plan de P4): es la búsqueda de la actividad del
 * vendedor, que encuentra el pago por su ID.
 */
export const MERCADO_PAGO_PAYMENT_URL = 'https://www.mercadopago.com.ar/activities?q={id}'

/** Espera desde la última tecla de la búsqueda de pedidos hasta pedir la lista, en milisegundos. */
export const ORDERS_SEARCH_DEBOUNCE_MS = 300

/** Largo máximo del texto de búsqueda de pedidos (el mismo que acepta `GET /admin/orders`). */
export const ORDERS_SEARCH_MAX_LENGTH = 100

/** Largo máximo de la nota del historial al cambiar el estado (el de `orderStatusChangeSchema`). */
export const ORDER_NOTE_MAX_LENGTH = 500
