/** Textos del checkout (spec 14.1 y 9.7), tal como están en el diseño. */
export const CHECKOUT_COPY = {
  /** Encabezado. */
  eyebrow: 'Checkout',
  title: 'Finalizá tu compra',
  /** Barra de pasos. */
  stepsLabel: 'Pasos del checkout',
  steps: ['Contacto', 'Envío', 'Pago'],
  back: 'Volver',
  next: 'Continuar',
  /** Carrito vacío. */
  emptyTitle: 'Tu carrito está vacío.',
  emptyAction: 'Ir a la tienda',
  /** Paso 1, Contacto. */
  email: 'Email',
  emailPlaceholder: 'vos@ejemplo.com',
  firstName: 'Nombre',
  lastName: 'Apellido',
  phone: 'Teléfono (opcional, para el correo)',
  phonePlaceholder: '11 2345 6789',
  contactNote: 'Te enviamos la confirmación y el seguimiento a este email.',
  privacyBefore: 'Usamos tus datos solo para gestionar tu pedido. Más en nuestra',
  privacyLink: 'Política de privacidad',
  /** Paso 2, Envío. */
  shippingMethod: 'Método de envío',
  shippingNote: 'Costos fijos por método; el valor final se confirma antes de pagar.',
  noShippingOptions: 'No hay métodos de envío disponibles por ahora. Escribinos y lo resolvemos.',
  free: 'Gratis',
  savedAddress: 'Usar una dirección guardada',
  savedAddressPlaceholder: 'Elegí una dirección…',
  street: 'Calle',
  number: 'Número',
  apartment: 'Piso / Depto (opcional)',
  postalCode: 'Código postal',
  postalCodePlaceholder: '1414',
  city: 'Ciudad',
  province: 'Provincia',
  provincePlaceholder: 'Elegí…',
  /** Paso 3, Pago. */
  paymentMethod: 'Medio de pago',
  mpLabel: 'Mercado Pago',
  mpHint: 'Tarjetas, dinero en cuenta y más',
  cardLabel: 'Tarjeta de crédito o débito',
  cardHint: 'Visa, Mastercard, American Express',
  mpNote:
    'Te llevamos a Mercado Pago para completar el pago de forma segura y volvés acá con la confirmación.',
  processedBy: 'Pago procesado por Mercado Pago. No guardamos los datos de tu tarjeta.',
  withdrawal:
    'Tenés 10 días corridos desde que recibís el producto para arrepentirte de la compra, sin costo.',
  withdrawalLink: 'Botón de arrepentimiento',
  termsBefore: 'Al pagar aceptás los',
  termsLink: 'Términos',
  termsAnd: 'y la',
  termsPrivacyLink: 'Política de privacidad',
  creatingOrder: 'Confirmando tu pedido…',
  connectingMp: 'Conectando con Mercado Pago…',
  processing: 'Procesando pago seguro…',
  conflictTitle: 'Algo cambió en tu carrito',
  conflictText:
    'Actualizamos el resumen con los valores de ahora. Revisalo y confirmá de nuevo: todavía no te cobramos nada.',
  confirmAgain: 'Confirmar de nuevo',
  orderChanged:
    'Cambió algo de tu pedido (el carrito, tus datos o el envío). Confirmalo de nuevo con el medio de pago elegido: todavía no te cobramos nada.',
  retry: 'Probar de nuevo',
  orderError: 'No pudimos confirmar tu pedido. Probá de nuevo.',
  networkError: 'No pudimos conectar, probá de nuevo',
  payError: 'No pudimos iniciar el pago. Probá de nuevo.',
  orderExpired:
    'Tu pedido venció o ya no se puede pagar. Elegí el medio de pago para confirmarlo de nuevo.',
  blocked: 'Hay productos sin stock en tu carrito. Quitalos para poder pagar.',
  viewCart: 'Ver carrito',
  /** Resumen lateral "Tu pedido". */
  summaryTitle: 'Tu pedido',
  kitSavings: 'Ahorro por kit',
  subtotal: 'Subtotal',
  shipping: 'Envío',
  shippingPending: 'Se calcula en el paso 2',
  total: 'Total',
  soldOut: 'Sin stock',
  quoteError: 'No pudimos actualizar el resumen. Probá de nuevo en unos segundos.',
} as const

/**
 * Número y nombre de un paso en la barra ("01 Contacto").
 *
 * @param index - Paso, de 0 a 2.
 * @returns El número con dos dígitos.
 * @throws {RangeError} Si el paso no es un entero entre 0 y 2.
 */
export function stepNumber(index: number): string {
  if (!Number.isInteger(index) || index < 0 || index > 2) {
    throw new RangeError(
      `El paso tiene que ser un entero entre 0 y 2; se recibió ${String(index)}.`,
    )
  }
  return String(index + 1).padStart(2, '0')
}

/**
 * Texto del retiro en persona con el email del paso 1.
 *
 * @param email - Email del contacto; vacío si todavía no se cargó.
 */
export function pickupNote(email: string): string {
  const to = email === '' ? 'tu email' : email
  return `Sin costo. Cuando confirmemos el pago te escribimos a ${to} para coordinar día, horario y lugar de retiro.`
}

/**
 * Botón final de Mercado Pago con el total confirmado por el back.
 *
 * @param total - Total ya formateado ("$46.499").
 */
export function payWithMpLabel(total: string): string {
  return `Pagar ${total} con Mercado Pago`
}

/**
 * Botón final de la tarjeta con el total confirmado por el back.
 *
 * @param total - Total ya formateado ("$46.499").
 */
export function payLabel(total: string): string {
  return `Pagar ${total}`
}

/**
 * Aviso de la reserva del pedido (30 minutos).
 *
 * @param minutes - Minutos de la reserva.
 * @param until - Hasta cuándo, ya formateado en hora de Buenos Aires.
 */
export function reservationNote(minutes: number, until: string): string {
  return `Reservamos tu pedido por ${String(minutes)} minutos (hasta el ${until}).`
}
