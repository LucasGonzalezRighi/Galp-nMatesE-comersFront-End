/**
 * Textos de error de los formularios, los de la sección 15 del spec.
 *
 * Los schemas los usan como mensaje de cada regla (`.min(2, MESSAGES.required)`), así la tienda,
 * el dashboard y el modo de prueba muestran siempre las mismas palabras. Los que necesitan un
 * número son funciones.
 */
export const MESSAGES = {
  /** Campo obligatorio que quedó vacío. */
  required: 'Requerido',
  /** Texto demasiado largo; `n` es el máximo de caracteres. */
  max: (n: number) => `Máximo ${String(n)} caracteres`,
  /** Nombre con menos de 2 letras. */
  minLetters: 'Ingresá al menos 2 letras',
  /** Nombre con algo que no es letra, espacio, apóstrofo o guion. */
  onlyLetters: 'Usá solo letras',
  /** Email con formato inválido. */
  invalidEmail: 'Ingresá un email válido',
  /** Teléfono que no queda en 10 dígitos o que trae el 0 o el 15. */
  invalidPhone: 'Ingresá el código de área y el número, sin 0 ni 15',
  /** Número de calle que no es de 1 a 5 dígitos ni "S/N". */
  invalidStreetNumber: 'Ingresá el número o S/N',
  /** Código postal fuera del formato argentino (`1414` o `C1414ABC`). */
  invalidPostalCode: 'Código postal inválido',
  /** Provincia que no es una de las 24 jurisdicciones del selector. */
  invalidProvince: 'Elegí una provincia',
  /** Nombre del titular de la tarjeta vacío o muy corto. */
  cardholderName: 'Como figura en la tarjeta',
  /** DNI que no tiene 7 u 8 dígitos. */
  invalidDni: 'DNI inválido',
  /**
   * Documento de otro tipo que no es alfanumérico de 5 a 20 caracteres.
   *
   * No está en el spec: se agrega porque el spec solo trae el texto del DNI.
   */
  invalidDocument: 'Documento inválido',
  /** Número de tarjeta incompleto, según el campo seguro de Mercado Pago. */
  incompleteCardNumber: 'Número incompleto',
  /** Vencimiento de la tarjeta inválido, según el campo seguro de Mercado Pago. */
  invalidCardExpiry: 'Vencimiento inválido',
  /** Código de seguridad inválido, según el campo seguro de Mercado Pago. */
  invalidCardCvc: 'CVC inválido',
  /** Reseña sin puntuación de 1 a 5 estrellas. */
  reviewRating: 'Elegí una puntuación de 1 a 5 estrellas.',
  /** Texto de la reseña con menos de 10 caracteres. */
  reviewText: 'Contanos un poco más (mínimo 10 caracteres)',
  /** Formulario de contacto sin nombre. */
  contactName: 'Contanos tu nombre',
  /** Mensaje del formulario de contacto con menos de 10 caracteres. */
  contactMessage: 'Escribí al menos 10 caracteres',
  /** Número de pedido que no tiene el formato `GLP-12345`. */
  invalidOrderNumber: 'El número tiene el formato GLP-12345',
  /** Contraseña de menos de 10 caracteres o sin letras y números. */
  weakPassword: 'Mínimo 10 caracteres, con letras y números',
  /**
   * La confirmación de la contraseña no es igual a la contraseña.
   *
   * No está en la tabla del spec: lo pide la Task 6 del plan para el restablecimiento.
   */
  passwordMismatch: 'Las contraseñas no coinciden',
  /** Slug con algo que no es minúscula, número o guion. */
  invalidSlug: 'Solo minúsculas, números y guiones',
  /** CUIT con formato o dígito verificador inválidos. */
  invalidCuit: 'CUIT inválido',
} as const
