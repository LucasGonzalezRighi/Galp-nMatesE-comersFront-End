import { cartTotals, ORDER_RESERVATION_MINUTES, pesos } from '@galpon/domain'
import type {
  CardPaymentResult,
  ContactReason,
  Customer,
  OrderShipping,
  OrderStatus,
  OrderTracking,
  PaymentMethod,
  PaymentStatus,
  ReviewStatus,
  ShippingAddress,
  ShippingMethod,
} from '../../generated/schema'
import type { CartItem } from '../handlers/pricing'
import type { MockDb, MockMessage, MockOrder, MockPaymentIntent, MockReview } from '../types'
import { priceCart } from '../handlers/pricing'

/** Minutos de un día, para escribir las fechas de la demostración. */
const DAY = 24 * 60

/** Cuánto se recuerda la clave de idempotencia de un pedido: 24 horas, como en `POST /orders`. */
const IDEMPOTENCY_TTL_MINUTES = DAY

/** Intento de pago de un pedido de la demostración. */
interface DemoIntent {
  /** Preferencia de Mercado Pago o tarjeta. */
  method: PaymentMethod
  /** Estado del intento. */
  status: PaymentStatus
  /** Detalle del estado como lo informa Mercado Pago, o `null`. */
  statusDetail: string | null
  /** Cuotas, o `null`. */
  installments: number | null
  /** Tipo de medio de pago de Mercado Pago (`credit_card`, `account_money`…). */
  paymentTypeId: string
  /** Últimos 4 dígitos de la tarjeta, o `null`. */
  lastFour: string | null
  /** Minutos antes de `now` en que se creó. */
  minutesAgo: number
}

/** Cambio de estado del historial, después de la creación del pedido. */
interface DemoStep {
  /** Estado al que pasó el pedido. */
  status: OrderStatus
  /** Minutos antes de `now`. */
  minutesAgo: number
  /** Nota del historial, si hay. */
  note?: string
}

/** Pedido de la demostración: lo que cambia entre uno y otro (el resto sale de las reglas). */
interface DemoOrder {
  /** Número del pedido (`GLP-09xxx`, lejos de los que genera el mock). */
  number: string
  /** Datos de quien compra. */
  customer: Customer
  /** Método de envío. */
  shippingMethod: ShippingMethod
  /** Dirección del envío, o `null` en el retiro en persona. */
  address: ShippingAddress | null
  /** Líneas del carrito, cotizadas con `priceCart` al sembrar. */
  items: CartItem[]
  /** Forma de pago elegida en el checkout. */
  paymentMethod: PaymentMethod
  /** Minutos antes de `now` en que se creó. */
  minutesAgo: number
  /** Cambios de estado después de `pending_payment`, del más viejo al más nuevo. */
  steps: DemoStep[]
  /** Intentos de pago, del más viejo al más nuevo. */
  intents: DemoIntent[]
  /** Datos del despacho, o `null`. */
  tracking: OrderTracking | null
}

/** Mensaje de la bandeja de la demostración. */
interface DemoMessage {
  /** Contacto o arrepentimiento. */
  kind: MockMessage['kind']
  /** Nombre de quien escribió. */
  name: string
  /** Email de quien escribió. */
  email: string
  /** Pedido del que se trata, o `null`. */
  orderNumber: string | null
  /** Motivo del formulario de contacto, o `null` en un arrepentimiento. */
  reason: ContactReason | null
  /** Texto, o `null` en un arrepentimiento sin comentario. */
  message: string | null
  /** Si ya se leyó. */
  read: boolean
  /** Minutos antes de `now` en que llegó. */
  minutesAgo: number
}

/** Reseña nueva de la demostración, sobre un producto de los fixtures. */
interface DemoReview {
  /** Identificador del producto reseñado. */
  productId: string
  /** Nombre con el que firma. */
  authorName: string
  /** Puntuación de 1 a 5. */
  rating: number
  /** Texto de la reseña. */
  text: string
  /** Estado de moderación. */
  status: ReviewStatus
  /** Minutos antes de `now` en que llegó. */
  minutesAgo: number
}

/** Datos de demostración que siembra el admin: pedidos, mensajes y reseñas a moderar. */
export interface AdminDemoFixture {
  /** Los 12 pedidos, del más viejo al más nuevo según su número. */
  orders: readonly DemoOrder[]
  /** Los 8 mensajes, del más viejo al más nuevo. */
  messages: readonly DemoMessage[]
  /** Las 5 reseñas nuevas. */
  reviews: readonly DemoReview[]
}

/** Arma un cliente de la demostración con email de ejemplo. */
function customer(firstName: string, lastName: string, email: string, phone: string | null) {
  return { firstName, lastName, email, phone }
}

/** Línea de un producto suelto (con cuero y virola si es un mate). */
function product(
  productId: string,
  quantity: number,
  options?: NonNullable<Extract<CartItem, { type: 'product' }>['options']>,
): CartItem {
  return { type: 'product', productId, quantity, ...(options === undefined ? {} : { options }) }
}

/** Pago aprobado de la demostración. */
function approved(
  method: PaymentMethod,
  paymentTypeId: string,
  minutesAgo: number,
  card: { installments: number; lastFour: string } | null = null,
): DemoIntent {
  return {
    method,
    status: 'approved',
    statusDetail: 'accredited',
    installments: card?.installments ?? (method === 'card' ? 1 : null),
    paymentTypeId,
    lastFour: card?.lastFour ?? null,
    minutesAgo,
  }
}

/**
 * Datos de demostración del admin (§13.2, refinamiento 11 del plan de P4), con las fechas en
 * minutos antes de `now`: los 12 pedidos de la tabla del README, 8 mensajes (5 de contacto y 3
 * arrepentimientos, 3 sin leer) y 5 reseñas nuevas (4 pendientes y 1 oculta). Con los fixtures
 * del catálogo, el resumen da 3 pedidos para despachar, 4 reseñas pendientes, 3 mensajes sin leer
 * y 3 alertas de pago.
 */
export const FIXTURE_ADMIN_DEMO: AdminDemoFixture = {
  orders: [
    {
      number: 'GLP-09001',
      customer: customer('Lucía', 'Pérez', 'lucia.perez@example.com', '1145678901'),
      shippingMethod: 'home',
      address: {
        street: 'Av. Corrientes',
        number: '1234',
        apartment: '5° B',
        city: 'Ciudad Autónoma de Buenos Aires',
        postalCode: 'C1043AAZ',
        province: 'CABA',
      },
      items: [
        product('prd-imperial-premium', 1, { leather: 'Negro', ferrule: 'Alpaca cincelada' }),
        product('prd-yerba-canarias', 2),
      ],
      paymentMethod: 'card',
      minutesAgo: 6,
      steps: [{ status: 'paid', minutesAgo: 1 }],
      intents: [approved('card', 'credit_card', 4, { installments: 3, lastFour: '4242' })],
      tracking: null,
    },
    {
      number: 'GLP-09002',
      customer: customer('Martín', 'Gómez', 'martin.gomez@example.com', null),
      shippingMethod: 'pickup',
      address: null,
      items: [
        {
          type: 'kit',
          mateId: 'prd-torpedo-premium',
          bombillaId: 'prd-bombillon-premium-curvo',
          yerbaId: 'prd-yerba-serena',
          leather: 'Marrón',
          quantity: 1,
        },
      ],
      paymentMethod: 'mp_redirect',
      minutesAgo: 8,
      steps: [{ status: 'paid', minutesAgo: 2 }],
      // Dos pagos aprobados para el mismo pedido: el resumen avisa que hay que devolver uno.
      intents: [
        approved('mp_redirect', 'account_money', 7),
        approved('mp_redirect', 'account_money', 5),
      ],
      tracking: null,
    },
    {
      number: 'GLP-09003',
      customer: customer('Carla', 'Fernández', 'carla.fernandez@example.com', '3514567890'),
      shippingMethod: 'branch',
      address: { city: 'Córdoba', postalCode: 'X5000', province: 'Córdoba' },
      items: [product('prd-camionero-pelo', 1, { leather: 'Crudo', ferrule: 'Alpaca lisa' })],
      paymentMethod: 'mp_redirect',
      minutesAgo: DAY,
      steps: [
        { status: 'paid', minutesAgo: DAY - 5 },
        { status: 'preparing', minutesAgo: DAY - 120 },
      ],
      intents: [approved('mp_redirect', 'credit_card', DAY - 3)],
      tracking: null,
    },
    {
      number: 'GLP-09004',
      customer: customer('Julián', 'Rodríguez', 'julian.rodriguez@example.com', '2214567890'),
      shippingMethod: 'home',
      address: {
        street: 'Calle 7',
        number: '845',
        apartment: null,
        city: 'La Plata',
        postalCode: 'B1900',
        province: 'Buenos Aires',
      },
      items: [product('prd-bombillon-curvo-alpaca', 1), product('prd-yerba-jengibre', 1)],
      paymentMethod: 'card',
      minutesAgo: 3 * DAY,
      steps: [
        { status: 'paid', minutesAgo: 3 * DAY - 5 },
        { status: 'shipped', minutesAgo: 2 * DAY },
      ],
      intents: [approved('card', 'debit_card', 3 * DAY - 3, { installments: 1, lastFour: '0604' })],
      tracking: { carrier: 'Andreani', number: 'AND123456789' },
    },
    {
      number: 'GLP-09005',
      customer: customer('Sofía', 'Martínez', 'sofia.martinez@example.com', '3414567890'),
      shippingMethod: 'home',
      address: {
        street: 'Bv. Oroño',
        number: '1520',
        apartment: '3° A',
        city: 'Rosario',
        postalCode: 'S2000',
        province: 'Santa Fe',
      },
      items: [product('prd-ranchero-manchas', 1, { leather: 'Negro', ferrule: 'Acero' })],
      paymentMethod: 'mp_redirect',
      minutesAgo: 6 * DAY,
      steps: [
        { status: 'paid', minutesAgo: 6 * DAY - 5 },
        { status: 'shipped', minutesAgo: 5 * DAY },
        { status: 'delivered', minutesAgo: 2 * DAY },
      ],
      intents: [approved('mp_redirect', 'account_money', 6 * DAY - 3)],
      tracking: { carrier: 'Correo Argentino', number: 'CA987654321AR' },
    },
    {
      number: 'GLP-09006',
      customer: customer('Tomás', 'López', 'tomas.lopez@example.com', '2614567890'),
      shippingMethod: 'home',
      address: {
        street: 'San Martín',
        number: '980',
        apartment: null,
        city: 'Mendoza',
        postalCode: 'M5500',
        province: 'Mendoza',
      },
      items: [product('prd-yerba-canarias', 2)],
      paymentMethod: 'mp_redirect',
      minutesAgo: 10,
      steps: [],
      intents: [],
      tracking: null,
    },
    {
      number: 'GLP-09007',
      customer: customer('Valentina', 'Díaz', 'valentina.diaz@example.com', '3814567890'),
      shippingMethod: 'branch',
      address: { city: 'San Miguel de Tucumán', postalCode: 'T4000', province: 'Tucumán' },
      items: [product('prd-imperial-criollo', 1, { leather: 'Borravino', ferrule: 'Alpaca lisa' })],
      paymentMethod: 'card',
      minutesAgo: 9,
      steps: [],
      // Pago con tarjeta en revisión: mientras dure, el pedido no se puede cancelar.
      intents: [
        {
          method: 'card',
          status: 'pending',
          statusDetail: 'pending_contingency',
          installments: 1,
          paymentTypeId: 'credit_card',
          lastFour: '3704',
          minutesAgo: 8,
        },
      ],
      tracking: null,
    },
    {
      number: 'GLP-09008',
      customer: customer('Nicolás', 'Romero', 'nicolas.romero@example.com', null),
      shippingMethod: 'home',
      address: {
        street: 'Av. Cabildo',
        number: '2040',
        apartment: '8° C',
        city: 'Ciudad Autónoma de Buenos Aires',
        postalCode: 'C1428',
        province: 'CABA',
      },
      items: [product('prd-bombillon-mini-loro', 1)],
      paymentMethod: 'mp_redirect',
      minutesAgo: 2 * DAY,
      steps: [{ status: 'expired', minutesAgo: 2 * DAY - ORDER_RESERVATION_MINUTES }],
      intents: [],
      tracking: null,
    },
    {
      number: 'GLP-09009',
      customer: customer('Camila', 'Sosa', 'camila.sosa@example.com', '1156789012'),
      shippingMethod: 'pickup',
      address: null,
      items: [
        product('prd-torpedo-cincelada', 1, { leather: 'Negro', ferrule: 'Alpaca cincelada' }),
      ],
      paymentMethod: 'mp_redirect',
      minutesAgo: 4 * DAY,
      steps: [
        { status: 'cancelled', minutesAgo: 4 * DAY - 15, note: 'Pedido de prueba cancelado' },
      ],
      intents: [],
      tracking: null,
    },
    {
      number: 'GLP-09010',
      customer: customer('Federico', 'Álvarez', 'federico.alvarez@example.com', '2234567890'),
      shippingMethod: 'home',
      address: {
        street: 'Güemes',
        number: '3150',
        apartment: null,
        city: 'Mar del Plata',
        postalCode: 'B7600',
        province: 'Buenos Aires',
      },
      items: [
        product('prd-imperial-calabaza', 1, { leather: 'Marrón', ferrule: 'Alpaca cincelada' }),
      ],
      paymentMethod: 'card',
      minutesAgo: 9 * DAY,
      steps: [
        { status: 'paid', minutesAgo: 9 * DAY - 5 },
        { status: 'refunded', minutesAgo: 8 * DAY },
      ],
      intents: [
        {
          method: 'card',
          status: 'refunded',
          statusDetail: 'refunded',
          installments: 1,
          paymentTypeId: 'credit_card',
          lastFour: '5678',
          minutesAgo: 9 * DAY - 3,
        },
      ],
      tracking: null,
    },
    {
      number: 'GLP-09011',
      customer: customer('Agustina', 'Torres', 'agustina.torres@example.com', '2994567890'),
      shippingMethod: 'home',
      address: {
        street: 'Av. Argentina',
        number: '410',
        apartment: null,
        city: 'Neuquén',
        postalCode: 'Q8300',
        province: 'Neuquén',
      },
      items: [
        product('prd-camionero-criollo', 1, { leather: 'Negro', ferrule: 'Alpaca lisa' }),
        product('prd-bombillon-100-alpaca', 1),
      ],
      paymentMethod: 'card',
      minutesAgo: 12 * DAY,
      steps: [
        { status: 'paid', minutesAgo: 12 * DAY - 5 },
        { status: 'shipped', minutesAgo: 11 * DAY },
        { status: 'delivered', minutesAgo: 8 * DAY },
      ],
      // El cliente desconoció el pago después de recibir el pedido.
      intents: [
        {
          method: 'card',
          status: 'charged_back',
          statusDetail: null,
          installments: 1,
          paymentTypeId: 'credit_card',
          lastFour: '9012',
          minutesAgo: 12 * DAY - 3,
        },
      ],
      tracking: { carrier: 'Andreani', number: 'AND555000111' },
    },
    {
      number: 'GLP-09012',
      customer: customer('Matías', 'Ruiz', 'matias.ruiz@example.com', '3874567890'),
      shippingMethod: 'branch',
      address: { city: 'Salta', postalCode: 'A4400', province: 'Salta' },
      items: [
        product('prd-torpedo-borravino', 1, { leather: 'Borravino', ferrule: 'Alpaca cincelada' }),
      ],
      paymentMethod: 'mp_redirect',
      minutesAgo: 5 * DAY,
      steps: [
        { status: 'paid', minutesAgo: 5 * DAY - 5 },
        { status: 'shipped', minutesAgo: 4 * DAY },
      ],
      // El cliente abrió una mediación en Mercado Pago.
      intents: [
        {
          method: 'mp_redirect',
          status: 'in_dispute',
          statusDetail: null,
          installments: null,
          paymentTypeId: 'account_money',
          lastFour: null,
          minutesAgo: 5 * DAY - 3,
        },
      ],
      tracking: { carrier: 'Correo Argentino', number: 'CA112233445AR' },
    },
  ],
  messages: [
    {
      kind: 'contact',
      name: 'Sofía Martínez',
      email: 'sofia.martinez@example.com',
      orderNumber: 'GLP-09005',
      reason: 'Pedido',
      message: '¿El mate viene curado o lo tengo que curar yo?',
      read: true,
      minutesAgo: 6 * DAY - 60,
    },
    {
      kind: 'withdrawal',
      name: 'Federico Álvarez',
      email: 'federico.alvarez@example.com',
      orderNumber: 'GLP-09010',
      reason: null,
      message: null,
      read: true,
      minutesAgo: 5 * DAY,
    },
    {
      kind: 'contact',
      name: 'Julián Rodríguez',
      email: 'julian.rodriguez@example.com',
      orderNumber: 'GLP-09004',
      reason: 'Envío',
      message: '¿Me pasan el seguimiento del envío? No me llegó el mail.',
      read: true,
      minutesAgo: 2 * DAY - 60,
    },
    {
      kind: 'contact',
      name: 'Ramiro Benítez',
      email: 'ramiro.benitez@example.com',
      orderNumber: null,
      reason: 'Otro',
      message: '¿Hacen mates con grabado para regalos de empresa?',
      read: true,
      minutesAgo: 2 * DAY - 120,
    },
    {
      kind: 'withdrawal',
      name: 'Paula Medina',
      email: 'paula.medina@example.com',
      orderNumber: null,
      reason: null,
      message: 'Me arrepentí de la compra, todavía no abrí el paquete.',
      read: true,
      minutesAgo: DAY + 300,
    },
    {
      kind: 'contact',
      name: 'Carla Fernández',
      email: 'carla.fernandez@example.com',
      orderNumber: 'GLP-09003',
      reason: 'Cambio',
      message: '¿Puedo cambiar el cuero a negro antes de que lo despachen?',
      read: false,
      minutesAgo: DAY - 180,
    },
    {
      kind: 'withdrawal',
      name: 'Sofía Martínez',
      email: 'sofia.martinez@example.com',
      orderNumber: 'GLP-09005',
      reason: null,
      message: null,
      read: false,
      minutesAgo: 5 * 60,
    },
    {
      kind: 'contact',
      name: 'Martín Gómez',
      email: 'martin.gomez@example.com',
      orderNumber: 'GLP-09002',
      reason: 'Pedido',
      message: 'Creo que me cobraron dos veces el kit. ¿Lo pueden revisar?',
      read: false,
      minutesAgo: 30,
    },
  ],
  reviews: [
    {
      productId: 'prd-imperial-premium',
      authorName: 'Rocío V.',
      rating: 5,
      text: 'Llegó impecable y bien embalado. La virola es todavía más linda en persona.',
      status: 'pending',
      minutesAgo: 2 * 60,
    },
    {
      productId: 'prd-yerba-canarias',
      authorName: 'Diego A.',
      rating: 4,
      text: 'La de siempre, rinde bien. Llegó rápido a Rosario.',
      status: 'pending',
      minutesAgo: DAY,
    },
    {
      productId: 'prd-bombillon-premium-curvo',
      authorName: 'Florencia G.',
      rating: 5,
      text: 'No se tapa nunca y el pico de bronce es muy cómodo.',
      status: 'pending',
      minutesAgo: 2 * DAY,
    },
    {
      productId: 'prd-camionero-pelo',
      authorName: 'Gustavo L.',
      rating: 3,
      text: 'Lindo mate, pero el pelo del cuero es más corto de lo que esperaba.',
      status: 'pending',
      minutesAgo: 3 * DAY,
    },
    {
      productId: 'prd-torpedo-premium',
      authorName: 'Ofertas Ya',
      rating: 1,
      text: 'Conseguí mates más baratos en otra página, escribime por privado.',
      status: 'hidden',
      minutesAgo: 4 * DAY,
    },
  ],
}

/** Fecha ISO `minutes` minutos antes de `now`. */
function minutesBefore(now: Date, minutes: number): string {
  return new Date(now.getTime() - minutes * 60_000).toISOString()
}

/** Clave de idempotencia fija de un pedido de la demostración (un UUID que el front no genera). */
function demoKey(number: string, index: number): string {
  return `00000000-0000-4000-8000-${number.slice(4).padStart(8, '0')}${String(index).padStart(4, '0')}`
}

/** Arma el envío del pedido con el costo y el plazo de los ajustes. */
function demoShipping(db: MockDb, order: DemoOrder): OrderShipping {
  const option = db.settings.shippingOptions.find(
    (candidate) => candidate.method === order.shippingMethod,
  )
  if (option === undefined) {
    throw new Error(`Los ajustes no tienen el envío ${order.shippingMethod}.`)
  }
  const { costArs, eta } = option
  switch (order.shippingMethod) {
    case 'home':
    case 'branch':
      if (order.address === null) throw new Error(`Falta la dirección de ${order.number}.`)
      return { method: order.shippingMethod, address: order.address, costArs, eta }
    case 'pickup':
      return { method: 'pickup', address: null, costArs, eta }
  }
}

/** Arma un intento de pago de la demostración. */
function demoIntent(now: Date, order: DemoOrder, intent: DemoIntent, index: number) {
  const result: CardPaymentResult | null =
    intent.method === 'card'
      ? { paymentStatus: intent.status, statusDetail: intent.statusDetail, challenge: null }
      : null
  const paymentIntent: MockPaymentIntent = {
    id: `int-demo-${order.number.slice(4)}-${String(index + 1)}`,
    method: intent.method,
    idempotencyKey: demoKey(order.number, index + 1),
    fingerprint: '{}',
    status: intent.status,
    statusDetail: intent.statusDetail,
    installments: intent.installments,
    paymentTypeId: intent.paymentTypeId,
    lastFour: intent.lastFour,
    mpPaymentId: `15${order.number.slice(4)}${String(index + 1).padStart(3, '0')}`,
    result,
    createdAt: minutesBefore(now, intent.minutesAgo),
  }
  return paymentIntent
}

/**
 * Arma un pedido de la demostración: las líneas y los importes salen de `priceCart` y `cartTotals`
 * (las mismas reglas que `POST /orders`), sin tocar el stock de los productos.
 */
function demoOrder(db: MockDb, now: Date, order: DemoOrder): MockOrder {
  const priced = priceCart(db, order.items, now)
  const lines = priced.lines.map((line) => {
    if (line.orderLine === null || line.amounts === null) {
      throw new Error(`El pedido ${order.number} tiene una línea que no se puede vender.`)
    }
    return { orderLine: line.orderLine, amounts: line.amounts }
  })
  const shipping = demoShipping(db, order)
  const totals = cartTotals(
    lines.map((line) => line.amounts),
    pesos(shipping.costArs),
  )
  const createdAt = minutesBefore(now, order.minutesAgo)
  const isWaiting = order.steps.length === 0
  return {
    number: order.number,
    // Nadie tiene el token de un pedido de la demostración: el hash vacío no coincide con ninguno.
    tokenHash: '',
    creation: {
      idempotencyKey: demoKey(order.number, 0),
      fingerprint: '{}',
      orderToken: '',
      expiresAt: minutesBefore(now, order.minutesAgo - IDEMPOTENCY_TTL_MINUTES),
    },
    ownerId: null,
    status: order.steps.at(-1)?.status ?? 'pending_payment',
    customer: order.customer,
    shipping,
    lines: lines.map((line) => line.orderLine),
    itemsGrossArs: totals.itemsGrossArs,
    kitSavingsArs: totals.kitSavingsArs,
    subtotalArs: totals.subtotalArs,
    shippingArs: shipping.costArs,
    totalArs: totals.totalArs,
    paymentMethod: order.paymentMethod,
    intents: order.intents.map((intent, index) => demoIntent(now, order, intent, index)),
    // Solo los que esperan el pago reservan stock; los pagados ya lo descontaron antes de la demo.
    reservation: isWaiting ? priced.reservation : [],
    tracking: order.tracking,
    history: [
      { status: 'pending_payment', at: createdAt, note: null },
      ...order.steps.map((step) => ({
        status: step.status,
        at: minutesBefore(now, step.minutesAgo),
        note: step.note ?? null,
      })),
    ],
    reservedUntil: minutesBefore(now, order.minutesAgo - ORDER_RESERVATION_MINUTES),
    createdAt,
  }
}

/**
 * Siembra en la base los datos de demostración del admin ({@link FIXTURE_ADMIN_DEMO}), con las
 * fechas relativas a `now`. Agrega los pedidos, los mensajes (`msg-0001`…, arrepentimientos
 * `ARR-000001`…) y las reseñas; no cambia el stock ni el resto de la base.
 *
 * @param db - Base recién creada, sin pedidos ni mensajes.
 * @param now - Momento de referencia de las fechas.
 * @throws {RangeError} Si `now` no es una fecha válida o la base ya tiene pedidos o mensajes.
 */
export function seedAdminDemo(db: MockDb, now: Date): void {
  if (Number.isNaN(now.getTime())) {
    throw new RangeError('La fecha de los datos de demostración no es válida.')
  }
  if (db.orders.length > 0 || db.messages.length > 0) {
    throw new RangeError(
      'Los datos de demostración se siembran en una base sin pedidos ni mensajes.',
    )
  }
  for (const order of FIXTURE_ADMIN_DEMO.orders) db.orders.push(demoOrder(db, now, order))
  let withdrawals = 0
  FIXTURE_ADMIN_DEMO.messages.forEach((message, index) => {
    if (message.kind === 'withdrawal') withdrawals += 1
    const entry: MockMessage = {
      id: `msg-${String(index + 1).padStart(4, '0')}`,
      kind: message.kind,
      name: message.name,
      email: message.email,
      orderNumber: message.orderNumber,
      reason: message.reason,
      message: message.message,
      code: message.kind === 'withdrawal' ? `ARR-${String(withdrawals).padStart(6, '0')}` : null,
      createdAt: minutesBefore(now, message.minutesAgo),
      read: message.read,
    }
    db.messages.push(entry)
  })
  FIXTURE_ADMIN_DEMO.reviews.forEach((review, index) => {
    const entry: MockReview = {
      id: `rev-demo-${String(index + 1)}`,
      productId: review.productId,
      authorName: review.authorName,
      rating: review.rating,
      text: review.text,
      createdAt: minutesBefore(now, review.minutesAgo),
      status: review.status,
      featured: false,
      verifiedPurchase: false,
    }
    db.reviews.push(entry)
  })
}
