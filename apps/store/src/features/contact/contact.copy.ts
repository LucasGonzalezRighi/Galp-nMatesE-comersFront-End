/** Microtextos de Contacto, tal como están en el diseño y en el spec (9.5 y 9.7). */
export const CONTACT_COPY = {
  /** Rótulo sobre el título. */
  eyebrow: 'Contacto',
  /** Título de la página. */
  title: 'Escribinos.',
  /** Bajada de la página. */
  intro:
    'Toda la atención es por mail. Si tuviste un problema con tu pedido, contanos y lo resolvemos.',
  /** Botón que copia el email. */
  copy: 'Copiar',
  /** Botón después de copiar. */
  copied: 'Copiado',
  /** Anuncio para lectores de pantalla al copiar. */
  copiedAnnouncement: 'Email copiado',
  /** Título de los accesos a las preguntas frecuentes. */
  beforeWriting: 'Antes de escribir',
  /** Accesos a las preguntas frecuentes que más se consultan. */
  shortcuts: [
    { label: 'Envíos y seguimiento', href: '/preguntas-frecuentes#envios' },
    { label: 'Cambios y devoluciones', href: '/preguntas-frecuentes#cambios' },
    { label: 'Cómo curar tu mate', href: '/preguntas-frecuentes#curado' },
  ],
  /** Rótulos de los datos de atención del vendedor (Disposición 954/2025, spec 14.6). */
  alternativeChannel: 'Canal alternativo',
  supportArea: 'Área responsable',
  supportHours: 'Horario de atención',
  /** Etiquetas y ayudas del formulario. */
  name: 'Nombre',
  email: 'Email',
  orderNumber: 'Número de pedido (opcional)',
  orderNumberPlaceholder: 'GLP-12345',
  reason: 'Motivo',
  message: 'Mensaje',
  messagePlaceholder: 'Contanos qué pasó o qué necesitás',
  /** Aviso de privacidad (spec 9.5 y 14.6): lo que se hace con los datos, antes del link. */
  privacyBefore: 'Usamos tus datos solo para responderte. Más en nuestra',
  /** Texto del link a la política de privacidad. */
  privacyLink: 'Política de privacidad',
  /** Texto del botón de envío. */
  submit: 'Enviar mensaje',
  /** Texto del botón mientras se envía. */
  submitting: 'Enviando…',
  /** Error de red del formulario (spec 9.7). */
  networkError: 'No pudimos conectar, probá de nuevo',
  /** Error inesperado, cuando no llegó ningún mensaje de la API. */
  unexpectedError: 'No pudimos enviar tu mensaje, probá de nuevo',
  /** Confirmación: título. */
  sentTitle: 'Mensaje enviado',
  /** Confirmación: texto con el nombre y el email que escribió la persona. */
  sentText: (name: string, email: string): string => `Gracias, ${name}. Te respondemos a ${email}.`,
  /** Confirmación: botón para escribir otro mensaje. */
  another: 'Escribir otro mensaje',
} as const
