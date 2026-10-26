/** Microtextos del pago con tarjeta (spec 14.4 y 15), tal como están en el diseño. */
export const PAYMENTS_COPY = {
  /** Etiquetas de los campos. */
  cardNumber: 'Número de tarjeta',
  cardholderName: 'Nombre del titular',
  expirationDate: 'Vencimiento',
  securityCode: 'CVC',
  identificationType: 'Tipo de documento',
  identificationNumber: 'Número de documento',
  installments: 'Cuotas',
  /** Textos de ayuda dentro de los campos de la tarjeta. */
  cardNumberPlaceholder: '1234 5678 9012 3456',
  expirationDatePlaceholder: 'MM/AA',
  securityCodePlaceholder: '123',
  /** Tarjeta animada: lo que se ve antes de completar cada dato. */
  previewBrand: 'TARJETA',
  previewName: 'NOMBRE Y APELLIDO',
  previewExpiration: 'MM/AA',
  previewSecurityCode: '•••',
  /** Opción del selector de cuotas antes de conocer la tarjeta. */
  installmentsPending: 'Ingresá la tarjeta para ver las cuotas',
  /** Piezas de las opciones de cuotas. */
  onePayment: '1 pago de',
  installmentsWord: 'cuotas',
  withoutInterest: 'sin interés de',
  of: 'de',
  total: 'Total',
  separator: '·',
  cft: 'CFT',
  tea: 'TEA',
  /** Errores del formulario completo. */
  tokenError: 'No pudimos validar la tarjeta. Revisá los datos y probá de nuevo.',
  loadError:
    'No pudimos cargar el formulario de la tarjeta. Recargá la página o pagá con Mercado Pago.',
  /** Diálogo de 3-D Secure (spec 14.4). */
  challengeTitle: 'Verificá tu compra con tu banco',
  challengeFrameTitle: 'Verificación de tu banco',
  challengeDone: 'Ya terminé',
} as const
