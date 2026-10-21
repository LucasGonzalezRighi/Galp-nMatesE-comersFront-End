import type {
  AboutContent,
  AdminSettings,
  ContactMessageKind,
  ContactReason,
  FaqContent,
  FooterContent,
  HomeContent,
  Image,
  LegalContent,
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

/**
 * Base de datos simulada del modo de prueba: se siembra con los fixtures del diseño y se puede
 * guardar entera en un almacenamiento como JSON.
 *
 * Los pedidos y los clientes se tipan en las fases siguientes, cuando aparecen las pantallas
 * que los usan.
 */
export interface MockDb {
  /** Versión del formato; si cambia, lo guardado se descarta y se vuelve a sembrar. */
  version: 1
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
  /** Pedidos (se tipan en la fase de pedidos). */
  orders: unknown[]
  /** Mensajes de contacto y de arrepentimiento, del más viejo al más nuevo. */
  messages: MockMessage[]
  /** Clientes con cuenta (se tipan en la fase de clientes). */
  customers: unknown[]
}
