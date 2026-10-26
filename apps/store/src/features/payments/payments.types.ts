/** Campos de la tarjeta que dibuja la implementación (en vivo, dentro de iframes de Mercado Pago). */
export type PaymentFieldName = 'cardNumber' | 'expirationDate' | 'securityCode'

/** Los campos de la tarjeta en el orden en que aparecen en el formulario. */
export const PAYMENT_FIELD_NAMES = [
  'cardNumber',
  'expirationDate',
  'securityCode',
] as const satisfies readonly PaymentFieldName[]

/** Tipo de tarjeta según Mercado Pago: con débito hay un solo pago. */
export type CardPaymentTypeId = 'credit_card' | 'debit_card'

/** Estilo del texto dentro de cada campo (en vivo se manda al iframe, que no ve el CSS de la página). */
export interface PaymentFieldStyle {
  /** Color del texto. */
  color: string
  /** Familia tipográfica. */
  fontFamily: string
  /** Tamaño de la letra, por ejemplo `14px`. */
  fontSize: string
  /** Color del texto de ayuda. */
  placeholderColor: string
}

/** Dónde y cómo se dibuja un campo de la tarjeta. */
export interface PaymentFieldMount {
  /** Contenedor del campo; en vivo tiene que tener `id`, porque Mercado Pago monta por id. */
  container: HTMLElement
  /** Texto de ayuda dentro del campo, por ejemplo `MM/AA`. */
  placeholder: string
  /** Id del control (al que apunta el `<label>`) cuando la implementación dibuja uno propio. */
  inputId: string
  /** Id del mensaje de error del campo, para `aria-describedby`. */
  errorId: string
}

/** Opciones comunes a los tres campos. */
export interface PaymentFieldsMountOptions {
  /** Estilo del texto de los campos. */
  style: PaymentFieldStyle
}

/** Medio de pago que corresponde a los primeros dígitos de la tarjeta. */
export interface CardMethod {
  /** Marca según Mercado Pago, por ejemplo `visa`, `master` o `amex`. */
  paymentMethodId: string
  /** Nombre de la marca para mostrar, por ejemplo `Visa`. */
  name: string
  /** Crédito o débito. */
  paymentTypeId: CardPaymentTypeId
  /** Banco emisor, o `null` si la tarjeta no necesita elegirlo. */
  issuerId: string | null
  /** Largo del código de seguridad: 4 en Amex, 3 en las demás. */
  securityCodeLength: number
}

/** Aviso de que cambiaron los primeros dígitos de la tarjeta. */
export interface BinChangeEvent {
  /** Primeros 6 a 8 dígitos, o `null` si ya no hay suficientes. */
  bin: string | null
  /** Medio de pago de esos dígitos, o `null` si no hay BIN o no se reconoce la marca. */
  method: CardMethod | null
}

/** Aviso de que un campo pasó a ser válido o dejó de serlo. */
export interface ValidityChangeEvent {
  /** Campo que cambió. */
  field: PaymentFieldName
  /** Si lo que tiene escrito alcanza para pagar. */
  valid: boolean
}

/** Aviso de que un campo recibió o perdió el foco. */
export interface PaymentFieldFocusEvent {
  /** Campo que recibió o perdió el foco. */
  field: PaymentFieldName
}

/** Eventos de {@link PaymentFields} y lo que recibe cada uno. */
export interface PaymentFieldsEvents {
  /** Cambiaron los primeros dígitos del número. */
  binChange: BinChangeEvent
  /** Un campo pasó a ser válido o dejó de serlo. */
  validityChange: ValidityChangeEvent
  /** Un campo recibió el foco. */
  focus: PaymentFieldFocusEvent
  /** Un campo perdió el foco. */
  blur: PaymentFieldFocusEvent
}

/** Titular y documento con los que se pide el token de la tarjeta. */
export interface CardTokenInput {
  /** Nombre del titular como figura en la tarjeta. */
  cardholderName: string
  /** Tipo de documento según Mercado Pago, por ejemplo `DNI`. */
  identificationType: string
  /** Número de documento, sin puntos ni espacios. */
  identificationNumber: string
}

/** Tipo de documento que acepta Mercado Pago. */
export interface IdentificationType {
  /** Código del tipo, por ejemplo `DNI`. */
  id: string
  /** Nombre para mostrar. */
  name: string
}

/**
 * Campos de la tarjeta (número, vencimiento y código de seguridad) con una interfaz común a los
 * Secure Fields de Mercado Pago y a los campos simulados del modo de prueba. El formulario no sabe
 * cuál de las dos recibe: en vivo los dígitos viven dentro de iframes de Mercado Pago y nunca pasan
 * por el código de la tienda.
 */
export interface PaymentFields {
  /**
   * Dibuja los tres campos en sus contenedores.
   *
   * @param fields - Contenedor, texto de ayuda e ids de cada campo.
   * @param options - Estilo del texto.
   * @throws {RangeError} Si ya estaban montados o falta un dato del contenedor.
   */
  mount(
    fields: Readonly<Record<PaymentFieldName, PaymentFieldMount>>,
    options: PaymentFieldsMountOptions,
  ): Promise<void>
  /**
   * Escucha un evento de los campos.
   *
   * @param event - `binChange`, `validityChange`, `focus` o `blur`.
   * @param listener - Recibe los datos del evento.
   * @returns Una función que deja de escuchar.
   */
  on<E extends keyof PaymentFieldsEvents>(
    event: E,
    listener: (payload: PaymentFieldsEvents[E]) => void,
  ): () => void
  /**
   * Pide el token de un solo uso de la tarjeta; cada intento de pago necesita uno nuevo.
   *
   * @param input - Titular y documento.
   * @returns El token.
   * @throws {RangeError} Si los campos no están montados o el titular o el documento están vacíos.
   */
  createCardToken(input: CardTokenInput): Promise<string>
  /** Tipos de documento para el selector (DNI primero si existe). */
  getIdentificationTypes(): Promise<IdentificationType[]>
  /**
   * Lleva el foco a un campo, por ejemplo al primero con error.
   *
   * @param field - Campo que recibe el foco.
   */
  focus(field: PaymentFieldName): void
  /** Quita los campos y deja de avisar eventos. Se puede llamar más de una vez. */
  unmount(): void
}
