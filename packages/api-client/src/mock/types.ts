import type {
  AboutContent,
  Address,
  AdminSettings,
  CardPaymentResult,
  ContactMessageKind,
  ContactReason,
  Customer,
  FaqContent,
  FooterContent,
  HomeContent,
  Image,
  LegalContent,
  OrderHistoryEntry,
  OrderLine,
  OrderShipping,
  OrderStatus,
  OrderTracking,
  PaymentMethod,
  PaymentStatus,
  ProductGroup,
  ProductStatus,
  ProductTabsContent,
  ReviewStatus,
} from '../generated/schema'

/** Línea de productos de la base simulada (la cantidad de productos se calcula al responder). */
export interface MockCategory {
  /** Identificador de la línea, por ejemplo `cat-imperiales`. */
  id: string
  /** Identificador legible para la dirección web, por ejemplo `imperiales`. */
  slug: string
  /** Nombre de la línea. */
  name: string
  /** Grupo de productos al que pertenece. */
  group: ProductGroup
  /** Descripción corta de la línea. */
  blurb: string
  /** Lugar de la línea en el listado, empezando en 1. */
  position: number
  /** Foto de la línea, o `null` si todavía no tiene. */
  image: Image | null
}

/** Producto de la base simulada. */
export interface MockProduct {
  /** Identificador del producto, por ejemplo `prd-imperial-premium`. */
  id: string
  /** Identificador legible para la dirección web. */
  slug: string
  /** Número correlativo del que sale el código del producto. */
  sequence: number
  /** Identificador de la línea a la que pertenece. */
  categoryId: string
  /** Nombre del producto. */
  name: string
  /** Descripción del producto. */
  description: string
  /** Precio en pesos enteros, o `null` cuando se consulta por mail. */
  priceArs: number | null
  /** Unidades disponibles. */
  stock: number
  /** Si aparece entre los destacados. */
  featured: boolean
  /** Estado de publicación. */
  status: ProductStatus
  /** Fotos del producto. */
  images: Image[]
  /** Textos propios de las pestañas Materiales y Cuidado, o `null` para usar los del grupo. */
  tabsOverride: { materials?: string; care?: string } | null
  /** Slugs anteriores, que redirigen al actual. */
  previousSlugs: string[]
  /** Fecha de alta, ISO 8601 con hora y zona. */
  createdAt: string
  /** Fecha de la última modificación, ISO 8601 con hora y zona; al sembrar es la de alta. */
  updatedAt: string
}

/**
 * Foto subida en el modo de prueba (`POST /__mock/media`): un data URL reducido que reemplaza a
 * Cloudinary y sobrevive a las recargas junto con la base.
 */
export interface MockMedia {
  /** Data URL de la foto reducida (`data:image/webp;base64,…`). */
  url: string
  /** Ancho en píxeles de la foto original. */
  width: number
  /** Alto en píxeles de la foto original. */
  height: number
  /** Momento de la subida, ISO 8601 con hora y zona; las más viejas sin usar se borran primero. */
  createdAt: string
}

/** Reseña de la base simulada. */
export interface MockReview {
  /** Identificador de la reseña. */
  id: string
  /** Identificador del producto reseñado. */
  productId: string
  /** Nombre con el que firma la reseña. */
  authorName: string
  /** Puntuación de 1 a 5. */
  rating: number
  /** Texto de la reseña. */
  text: string
  /** Fecha de la reseña, ISO 8601 con hora y zona. */
  createdAt: string
  /** Estado de moderación. */
  status: ReviewStatus
  /** Si aparece en el inicio. */
  featured: boolean
  /** Si quien la escribió compró el producto. */
  verifiedPurchase: boolean
}

/** Mensaje de la bandeja de la base simulada: del formulario de contacto o un arrepentimiento. */
export interface MockMessage {
  /** Identificador del mensaje, por ejemplo `msg-0001`. */
  id: string
  /** Si es del formulario de contacto o una solicitud de arrepentimiento. */
  kind: ContactMessageKind
  /** Nombre de quien escribió. */
  name: string
  /** Email de quien escribió, en minúsculas. */
  email: string
  /** Número del pedido del que se trata (`GLP-12345`), o `null` si no corresponde. */
  orderNumber: string | null
  /** Motivo elegido en el formulario de contacto, o `null` en un arrepentimiento. */
  reason: ContactReason | null
  /** Texto del mensaje, o `null` en un arrepentimiento sin comentario. */
  message: string | null
  /** Código de comprobante de un arrepentimiento (`ARR-000001`), o `null` en un mensaje de contacto. */
  code: string | null
  /** Momento en que llegó, ISO 8601 con hora y zona. */
  createdAt: string
  /** Si ya se leyó. */
  read: boolean
}

/** Textos editables de la base simulada, uno por cada ruta de contenido de la API. */
export interface MockContent {
  /** Textos del inicio. */
  home: HomeContent
  /** Textos de Nosotros. */
  about: AboutContent
  /** Preguntas frecuentes. */
  faq: FaqContent
  /** Textos del pie de página. */
  footer: FooterContent
  /** Textos de las pestañas de la ficha de producto. */
  productTabs: ProductTabsContent
  /** Documentos legales. */
  legal: {
    /** Términos y condiciones. */
    terms: LegalContent
    /** Política de privacidad. */
    privacy: LegalContent
  }
}

/** Sesión abierta del administrador en la base simulada. */
export interface MockAdminSession {
  /** Email con el que se inició sesión. */
  email: string
  /** Token CSRF de la sesión. */
  csrfToken: string
  /** Vencimiento de la sesión, ISO 8601 con hora y zona. */
  expiresAt: string
}

/** Unidades de un producto que un pedido tiene reservadas mientras espera el pago. */
export interface MockReservation {
  /** Identificador del producto. */
  productId: string
  /** Unidades reservadas. */
  quantity: number
}

/** Intento de pago de un pedido: una preferencia de Mercado Pago o un pago con tarjeta. */
export interface MockPaymentIntent {
  /** Identificador del intento, por ejemplo `int-…`. */
  id: string
  /** Si es una preferencia (`mp_redirect`) o un pago con tarjeta (`card`). */
  method: PaymentMethod
  /** `Idempotency-Key` con la que se creó. */
  idempotencyKey: string
  /** Cuerpo del pedido que lo creó, en JSON con las claves ordenadas, para comparar repeticiones. */
  fingerprint: string
  /** Estado del intento; `none` es una preferencia que todavía no se pagó. */
  status: PaymentStatus
  /** Detalle del estado como lo informa Mercado Pago, o `null`. */
  statusDetail: string | null
  /** Cuotas elegidas, o `null` si no corresponde. */
  installments: number | null
  /** Tipo de medio de pago según Mercado Pago, o `null`. */
  paymentTypeId: string | null
  /** Últimos 4 dígitos de la tarjeta, o `null`. */
  lastFour: string | null
  /** Identificador del pago en Mercado Pago, o `null` mientras no hay pago. */
  mpPaymentId: string | null
  /** Respuesta del pago con tarjeta, que se repite tal cual con la misma clave; `null` en una preferencia. */
  result: CardPaymentResult | null
  /** Momento en que se creó, ISO 8601 con hora y zona. */
  createdAt: string
}

/** Respuesta recordada de la creación de un pedido, para repetirla con la misma clave. */
export interface MockOrderCreation {
  /** `Idempotency-Key` con la que se creó. */
  idempotencyKey: string
  /** Cuerpo del pedido, en JSON con las claves ordenadas. */
  fingerprint: string
  /**
   * Token entregado en la respuesta, en claro: se guarda solo para repetir el mismo `201` con la
   * misma clave (el back también guarda la respuesta de la clave). El acceso al pedido no lo usa:
   * se valida contra `MockOrder.tokenHash`.
   */
  orderToken: string
  /** Hasta cuándo se recuerda la clave (24 horas), ISO 8601 con hora y zona. */
  expiresAt: string
}

/** Pedido de la base simulada. */
export interface MockOrder {
  /** Número del pedido, `GLP-` y cinco dígitos. */
  number: string
  /** SHA-256 en hexadecimal del token del pedido: el acceso se valida contra el hash. */
  tokenHash: string
  /** Respuesta recordada de la creación, para la idempotencia. */
  creation: MockOrderCreation
  /** Identificador del cliente dueño, o `null` si es de un invitado. */
  ownerId: string | null
  /** Estado del pedido. */
  status: OrderStatus
  /** Datos de quien compra. */
  customer: Customer
  /** Envío, con el costo y el plazo del momento de la compra. */
  shipping: OrderShipping
  /** Líneas, copiadas con los nombres y precios del momento de la compra. */
  lines: OrderLine[]
  /** Suma de los precios de lista. */
  itemsGrossArs: number
  /** Suma de los ahorros por kit. */
  kitSavingsArs: number
  /** Importe de las líneas sin envío. */
  subtotalArs: number
  /** Costo del envío. */
  shippingArs: number
  /** Total con el envío. */
  totalArs: number
  /** Forma de pago elegida en el checkout. */
  paymentMethod: PaymentMethod
  /** Intentos de pago, del más viejo al más nuevo; solo uno puede estar activo. */
  intents: MockPaymentIntent[]
  /** Stock reservado; se vacía al pagarse (se descuenta) o al vencer (se libera). */
  reservation: MockReservation[]
  /** Datos del despacho, o `null`. */
  tracking: OrderTracking | null
  /** Cambios de estado, del más viejo al más nuevo. */
  history: OrderHistoryEntry[]
  /** Vencimiento de la reserva y del pedido, ISO 8601 con hora y zona. */
  reservedUntil: string
  /** Momento de creación, ISO 8601 con hora y zona. */
  createdAt: string
}

/** Cliente con cuenta de la base simulada. */
export interface MockCustomer {
  /** Identificador del cliente, por ejemplo `cus-0001`. */
  id: string
  /** Email, en minúsculas; es único. */
  email: string
  /** Nombre. */
  firstName: string
  /** Apellido. */
  lastName: string
  /** Teléfono de 10 dígitos, o `null`. */
  phone: string | null
  /** Contraseña de prueba, en claro: es una base simulada. */
  password: string
  /** Libreta de direcciones; a lo sumo una es la predeterminada. */
  addresses: Address[]
  /** Último pedido de cambio de contraseña, ISO 8601 con hora y zona, o `null`. */
  passwordResetRequestedAt: string | null
  /** Momento del alta, ISO 8601 con hora y zona. */
  createdAt: string
}

/** Sesión de la tienda: anónima (solo para el token CSRF) o de un cliente. */
export interface MockCustomerSession {
  /** Valor de la cookie de sesión. */
  id: string
  /** Cliente con la sesión iniciada, o `null` si es anónima. */
  customerId: string | null
  /** Token CSRF ligado a esta sesión. */
  csrfToken: string
  /** Vencimiento, ISO 8601 con hora y zona. */
  expiresAt: string
}

/**
 * Base de datos simulada del modo de prueba: se siembra con los fixtures del diseño y se puede
 * guardar entera en un almacenamiento como JSON.
 */
export interface MockDb {
  /** Versión del formato; si cambia, lo guardado se descarta y se vuelve a sembrar. */
  version: 3
  /** Líneas de productos. */
  categories: MockCategory[]
  /** Productos. */
  products: MockProduct[]
  /** Reseñas de todos los estados. */
  reviews: MockReview[]
  /** Textos editables. */
  content: MockContent
  /** Ajustes de la tienda. */
  settings: AdminSettings
  /** Cuenta del administrador. */
  adminAccount: {
    /** Email de inicio de sesión. */
    email: string
    /** Contraseña de prueba. */
    password: string
  }
  /** Sesión abierta del administrador, o `null` si no hay. */
  adminSession: MockAdminSession | null
  /** Pedidos, del más viejo al más nuevo. */
  orders: MockOrder[]
  /** Mensajes de contacto y de arrepentimiento, del más viejo al más nuevo. */
  messages: MockMessage[]
  /** Clientes con cuenta. */
  customers: MockCustomer[]
  /** Sesiones de la tienda (anónimas y de clientes). */
  customerSessions: MockCustomerSession[]
  /** Fotos subidas en el modo de prueba, por `publicId` (`galpon/productos/mock-…`). */
  media: Record<string, MockMedia>
}
