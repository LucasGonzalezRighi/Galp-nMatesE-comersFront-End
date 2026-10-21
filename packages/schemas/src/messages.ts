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
  /**
   * Motivo del formulario de contacto que no está en la lista.
   *
   * No está en el spec: el motivo no tiene mensaje en la tabla de la sección 15.
   */
  invalidContactReason: 'Elegí un motivo',
  /** Texto con menos de `n` caracteres, para los formularios del dashboard (los con * en el spec). */
  min: (n: number) => `Mínimo ${String(n)} caracteres`,
  /** Número entero fuera del rango `min`–`max`, para los formularios del dashboard. */
  intBetween: (min: number, max: number) =>
    `Ingresá un número entero entre ${String(min)} y ${String(max)}`,
  /** Número (con decimales si hace falta) fuera del rango `min`–`max`, por ejemplo el IVA. */
  numberBetween: (min: number, max: number) =>
    `Ingresá un número entre ${String(min)} y ${String(max)}`,
  /** Medida de una foto que no es un entero mayor a 0. */
  positiveInt: 'Ingresá un número entero mayor a 0',
  /** Precio de un producto que no es un entero mayor a 0 ni "a consultar". */
  invalidPrice: 'Ingresá un precio en pesos mayor a 0, o dejalo a consultar',
  /** Monto en pesos (por ejemplo el costo de envío) que no es un entero desde 0. */
  invalidAmount: 'Ingresá un monto en pesos, entero y desde 0',
  /** Precio de un producto por encima de los $99.999.999 que admite el contrato. */
  priceTooHigh: 'El precio no puede superar los $99.999.999',
  /** Monto en pesos (por ejemplo el costo de envío) por encima de los $99.999.999 del contrato. */
  amountTooHigh: 'El monto no puede superar los $99.999.999',
  /** Producto con más de `n` fotos. */
  maxImages: (n: number) => `Máximo ${String(n)} fotos`,
  /** Texto alternativo de una foto vacío, muy corto o muy largo (3 a 120 caracteres). */
  imageAlt: 'Escribí un texto alternativo de 3 a 120 caracteres',
  /** Opciones de envío que no son exactamente una por método. */
  invalidShippingOptions: 'Cargá los tres métodos de envío, uno de cada tipo',
  /** Dirección web que no empieza con http:// o https://. */
  invalidUrl: 'Ingresá una URL válida, con http:// o https://',
  /** Categoría sin grupo (mate, bombilla o yerba). */
  invalidGroup: 'Elegí un grupo',
  /** Estado del producto que no es borrador ni publicado. */
  invalidProductStatus: 'Elegí un estado',
} as const
