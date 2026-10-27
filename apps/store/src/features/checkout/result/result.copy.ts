import type { OrderStatus, PaymentMethod, ShippingMethod } from '@galpon/api-client'
import { ORDER_RESERVATION_MINUTES } from '@galpon/domain'

/**
 * Textos del resultado del pago (`/checkout/resultado`), del seguimiento del pedido de invitado
 * (`/pedido/{numero}`) y del simulador de Mercado Pago del modo de prueba (spec 14.2).
 */
export const RESULT_COPY = {
  /** Mientras se lee el pedido. */
  loading: 'Consultando tu pedido…',
  /** Sin token, con otro número o con un token que la API no reconoce: no revela si existe. */
  notFound: {
    title: 'No encontramos ese pedido',
    text: 'Puede que el link no sea de esta pestaña o que ya no esté disponible. Si hiciste una compra, revisá tu mail: ahí está el detalle.',
    shop: 'Ir a la tienda',
  },
  /** Error de red o del servidor al leer el pedido. */
  loadError: 'No pudimos consultar tu pedido, probá de nuevo.',
  /** Reintento de la consulta. */
  retry: 'Reintentar',
  /** Error al preparar un nuevo intento de pago. */
  retryError: 'No pudimos conectar, probá de nuevo.',
  /** Pago aprobado. */
  approved: {
    title: (firstName: string) => `¡Gracias, ${firstName}!`,
    /** Texto antes y después del número de pedido, que la pantalla marca en negrita. */
    text: (email: string) => ({
      before: 'Tu pedido ',
      after: ` está confirmado. Te enviamos el detalle a ${email}.`,
    }),
    help: 'Si hay algún problema, escribinos desde',
    contact: 'Contacto',
    keepShopping: 'Seguir comprando',
  },
  /** Pago pendiente de acreditación. */
  pending: {
    title: 'Estamos esperando la confirmación del pago',
    text: 'Lo consultamos cada 5 segundos. Podés quedarte en esta página.',
    timeoutTitle: 'Te avisamos por mail apenas se acredite',
    timeoutText: (number: string, email: string) =>
      `Tu pedido es el ${number}. Cuando Mercado Pago confirme el pago te escribimos a ${email}.`,
  },
  /** Falta la verificación 3-D Secure. */
  actionRequired: {
    title: 'Falta verificar la compra con tu banco',
    text: 'Tu banco pide confirmar que sos vos antes de aprobar el pago.',
    verify: 'Verificar con mi banco',
    payAgain: 'Pagar de nuevo',
  },
  /** Pago rechazado. */
  rejected: {
    title: 'El pago no se aprobó',
    retry: 'Probar con otro medio',
  },
  /** Sin pago o con el intento cancelado, y el pedido todavía reservado (Ruling P3-6). */
  unpaid: {
    title: 'No completaste el pago',
    text: 'Tu pedido sigue reservado por unos minutos. Podés pagarlo ahora.',
    pay: 'Pagar',
  },
  /** Pedido vencido (`status: expired`). */
  expired: {
    title: 'El pedido venció',
    text: `Pasaron ${String(ORDER_RESERVATION_MINUTES)} minutos sin que se confirme el pago y liberamos los productos reservados. Podés volver a armarlo desde el carrito.`,
    backToCart: 'Volver al carrito',
  },
  /** Seguimiento del pedido de invitado y estados sin acción (cancelado, devuelto…). */
  tracking: {
    title: (number: string) => `Pedido ${number}`,
  },
  /** Bloque con el detalle del pedido. */
  summary: {
    title: 'Tu pedido',
    subtotal: 'Subtotal',
    kitSavings: 'Ahorro por kit',
    free: 'Gratis',
    total: 'Total',
    payment: 'Pago',
    installments: (count: number) => (count === 1 ? '1 pago' : `${String(count)} cuotas`),
    card: (lastFour: string) => `Tarjeta terminada en ${lastFour}`,
  },
  /** Estado del pedido, para el seguimiento. */
  orderStatus: {
    pending_payment: 'Esperando el pago',
    paid: 'Pagado',
    preparing: 'En preparación',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
    expired: 'Vencido',
    refunded: 'Devuelto',
  } satisfies Record<OrderStatus, string>,
  /** Medio de pago. */
  paymentMethod: {
    mp_redirect: 'Mercado Pago',
    card: 'Tarjeta',
  } satisfies Record<PaymentMethod, string>,
  /** Forma de envío. */
  shippingMethod: {
    home: 'Envío a domicilio',
    branch: 'Envío a sucursal',
    pickup: 'Retiro en persona',
  } satisfies Record<ShippingMethod, string>,
  /** Simulador de Mercado Pago (solo modo de prueba). */
  simulator: {
    brand: 'Mercado Pago',
    badge: 'Simulador · modo de prueba',
    title: 'Elegí cómo termina el pago',
    challengeTitle: 'Verificación de tu banco (simulada)',
    challengeText: 'Así se ve el paso en que el banco confirma que sos vos.',
    order: 'Pedido',
    total: 'Total',
    approve: 'Aprobar',
    leavePending: 'Dejar pendiente',
    reject: 'Rechazar',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    closeWindow: 'Listo. Ya podés cerrar esta ventana.',
    invalid: 'Este link de pago no sirve: le falta el pedido o el intento de pago.',
    error: 'No pudimos aplicar el resultado: el pago ya se resolvió, se canceló o venció.',
    backToResult: 'Ver el pedido',
  },
} as const

/**
 * Motivo legible de cada `statusDetail` de rechazo de Mercado Pago (spec 14.2). Los que no están
 * acá muestran {@link DEFAULT_REJECTION_REASON}.
 */
export const REJECTION_REASONS: Readonly<Record<string, string>> = {
  cc_rejected_insufficient_amount: 'La tarjeta no tiene fondos suficientes.',
  cc_rejected_bad_filled_security_code: 'El código de seguridad no es correcto.',
  cc_rejected_bad_filled_date: 'La fecha de vencimiento no es correcta.',
  cc_rejected_bad_filled_card_number: 'El número de la tarjeta no es correcto.',
  cc_rejected_bad_filled_other: 'Algún dato de la tarjeta no es correcto.',
  cc_rejected_call_for_authorize:
    'Tenés que autorizar el pago con tu banco: llamalo y volvé a intentar.',
  cc_rejected_card_disabled: 'La tarjeta no está activada. Llamá a tu banco para activarla.',
  cc_rejected_card_error: 'No pudimos procesar el pago con esta tarjeta.',
  cc_rejected_duplicated_payment:
    'Ya hiciste un pago por el mismo importe. Si tenés que pagar de nuevo, usá otra tarjeta u otro medio.',
  cc_rejected_high_risk: 'El pago se rechazó por seguridad. Probá con otro medio.',
  cc_rejected_max_attempts: 'Llegaste al límite de intentos con esta tarjeta. Probá con otra.',
  cc_rejected_blacklist: 'No pudimos procesar el pago con esta tarjeta.',
  cc_rejected_3ds_challenge: 'No se pudo verificar la compra con tu banco.',
  cc_rejected_other_reason: 'La tarjeta no aprobó el pago.',
}

/** Motivo de un rechazo sin `statusDetail` o con uno que no está en {@link REJECTION_REASONS}. */
export const DEFAULT_REJECTION_REASON = 'El pago no se pudo procesar. Probá con otro medio.'
