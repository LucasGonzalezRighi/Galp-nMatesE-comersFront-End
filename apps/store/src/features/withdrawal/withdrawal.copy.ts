/** Microtextos del botón de arrepentimiento (spec 9.6, Disposición 954/2025). */
export const WITHDRAWAL_COPY = {
  /** Rótulo sobre el título de la página. */
  eyebrow: 'Arrepentimiento',
  /** Título de la página. */
  title: 'Botón de arrepentimiento',
  /** Bajada de la página. */
  intro:
    'Tenés 10 días corridos desde que recibís el producto para arrepentirte, sin dar explicaciones.',
  /** Puntos que aclaran qué se pide y qué se entrega. */
  notes: [
    'No hace falta tener una cuenta ni hacer otros trámites: alcanza con tu nombre y el email que usaste en la compra.',
    'Si tenés el número de pedido, nos ayuda a encontrarlo más rápido, pero no es obligatorio.',
    'Al enviar la solicitud te mostramos un código de identificación del trámite.',
  ],
  /** Etiquetas y ayudas del formulario. */
  name: 'Nombre',
  email: 'Email usado en la compra',
  orderNumber: 'Número de pedido (opcional)',
  orderNumberPlaceholder: 'GLP-12345',
  comment: 'Comentario (opcional)',
  commentPlaceholder: 'Si querés, contanos algo más',
  /** Aviso de privacidad (spec 14.6): lo que se hace con los datos, antes del link. */
  privacyBefore: 'Usamos tus datos solo para gestionar tu solicitud. Más en nuestra',
  /** Texto del link a la política de privacidad. */
  privacyLink: 'Política de privacidad',
  /** Texto del botón de envío. */
  submit: 'Solicitar arrepentimiento',
  /** Texto del botón mientras se envía. */
  submitting: 'Enviando…',
  /** Error de red del formulario (spec 9.7). */
  networkError: 'No pudimos conectar, probá de nuevo',
  /** Error inesperado, cuando no llegó ningún mensaje de la API. */
  unexpectedError: 'No pudimos enviar tu solicitud, probá de nuevo',
  /** Confirmación: título. */
  receiptTitle: 'Solicitud registrada',
  /** Confirmación: explicación del código. */
  receiptText: 'Guardá este código: identifica tu trámite de arrepentimiento.',
  /** Confirmación: rótulo del código. */
  receiptCode: 'Código de identificación',
  /** Confirmación: botón para empezar otra solicitud. */
  another: 'Hacer otra solicitud',
} as const
