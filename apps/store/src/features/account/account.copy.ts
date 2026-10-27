import type { OrderStatus, PaymentMethod, PaymentStatus, ShippingMethod } from '@galpon/api-client'

/** Microtextos de la cuenta de cliente (spec 9.1 y 9.7). */
export const ACCOUNT_COPY = {
  /** Rótulo sobre el título de las páginas de la cuenta. */
  eyebrow: 'Tu cuenta',
  /** Nombre accesible del acceso a la cuenta en el encabezado, sin sesión. */
  signInLink: 'Ingresar a tu cuenta',
  /** Nombre accesible del acceso a la cuenta en el encabezado, con sesión (va antes del nombre). */
  accountLink: 'Tu cuenta',

  /** Campos de los formularios. */
  email: 'Email',
  password: 'Contraseña',
  newPassword: 'Contraseña nueva',
  passwordConfirmation: 'Repetí la contraseña',
  passwordHint: 'Usá al menos 10 caracteres, con letras y números.',
  firstName: 'Nombre',
  lastName: 'Apellido',
  phone: 'Teléfono (opcional)',
  phoneHint: 'Con el código de área, sin 0 ni 15.',
  resetToken: 'Código del enlace',

  /** Aviso de privacidad de los formularios que piden datos (spec 14.6): lo que se hace con ellos, antes del link. */
  privacyBefore: 'Usamos tus datos solo para gestionar tu cuenta y tus pedidos. Más en nuestra',
  /** Texto del link a la política de privacidad. */
  privacyLink: 'Política de privacidad',

  /** Errores generales de los formularios (spec 9.7). */
  networkError: 'No pudimos conectar, probá de nuevo',
  unexpectedError: 'Algo salió mal. Probá de nuevo en unos minutos.',
  submitting: 'Enviando…',

  /** `/cuenta/ingresar`. */
  login: {
    title: 'Ingresá a tu cuenta.',
    intro: 'Mirá tus pedidos, guardá tus direcciones y comprá más rápido.',
    submit: 'Ingresar',
    invalidCredentials: 'Email o contraseña incorrectos.',
    forgot: '¿Olvidaste tu contraseña?',
    noAccount: '¿Todavía no tenés cuenta?',
    register: 'Creá una',
  },

  /** `/cuenta/registro`. */
  register: {
    title: 'Creá tu cuenta.',
    intro:
      'Si ya compraste como invitado con este email, tus pedidos aparecen en tu cuenta apenas la creás.',
    submit: 'Crear cuenta',
    emailTaken: 'Ya hay una cuenta con este email. Ingresá o recuperá tu contraseña.',
    haveAccount: '¿Ya tenés cuenta?',
    login: 'Ingresá',
  },

  /** `/cuenta/recuperar`. */
  forgot: {
    title: 'Recuperá tu contraseña.',
    intro: 'Escribí el email de tu cuenta y te mandamos un enlace para elegir una nueva.',
    submit: 'Enviar enlace',
    sentTitle: 'Revisá tu correo',
    sentText:
      'Si hay una cuenta con ese email, te llega un enlace para elegir una contraseña nueva. Puede tardar unos minutos.',
    back: 'Volver a ingresar',
  },

  /** `/cuenta/restablecer`. */
  reset: {
    title: 'Elegí una contraseña nueva.',
    intro: 'Usá al menos 10 caracteres, con letras y números.',
    submit: 'Guardar contraseña',
    invalidLink: 'El enlace no es válido o ya venció.',
    requestAnother: 'Pedí uno nuevo',
    doneTitle: 'Listo, cambiaste tu contraseña',
    doneText: 'Ya podés ingresar con la contraseña nueva.',
    login: 'Ingresar',
  },

  /** Navegación del área del cliente. */
  nav: {
    label: 'Secciones de tu cuenta',
    overview: 'Resumen',
    orders: 'Pedidos',
    addresses: 'Direcciones',
    logout: 'Cerrar sesión',
    loggingOut: 'Cerrando sesión…',
  },

  /** `/cuenta`: perfil y resumen. */
  overview: {
    greeting: 'Hola,',
    intro: 'Desde acá seguís tus pedidos y manejás tus datos.',
    lastOrder: 'Último pedido',
    noOrders: 'Todavía no hiciste pedidos',
    allOrders: 'Ver todos tus pedidos',
    defaultAddress: 'Dirección predeterminada',
    noAddresses: 'No tenés direcciones guardadas',
    manageAddresses: 'Administrar direcciones',
    profileTitle: 'Tus datos',
    profileSubmit: 'Guardar cambios',
    profileSaved: 'Guardamos tus datos.',
  },

  /** `/cuenta/pedidos`. */
  orders: {
    title: 'Tus pedidos',
    empty: 'Todavía no hiciste pedidos',
    emptyText: 'Cuando compres, vas a poder seguir cada pedido desde acá.',
    shop: 'Ir a la tienda',
    loadError: 'No pudimos cargar tus pedidos.',
    retry: 'Reintentar',
    previous: 'Anteriores',
    next: 'Siguientes',
    pageOf: (page: number, pages: number): string => `Página ${String(page)} de ${String(pages)}`,
    product: 'producto',
    products: 'productos',
  },

  /** `/cuenta/pedidos/[numero]`. */
  order: {
    back: 'Volver a tus pedidos',
    placedOn: 'Hecho el',
    status: 'Estado',
    payment: 'Pago',
    method: 'Medio',
    installments: (count: number): string => (count === 1 ? '1 pago' : `${String(count)} cuotas`),
    card: (lastFour: string): string => `Tarjeta terminada en ${lastFour}`,
    shipping: 'Envío',
    eta: 'Plazo estimado',
    tracking: 'Seguimiento',
    pickup: 'Retirás en persona; te avisamos por email cuando esté listo.',
    lines: 'Productos',
    itemsGross: 'Precio de lista',
    kitSavings: 'Ahorro por kit',
    subtotal: 'Subtotal',
    shippingCost: 'Envío',
    free: 'Gratis',
    total: 'Total',
    history: 'Historial',
    notFoundTitle: 'No encontramos ese pedido',
    notFoundText: 'Revisá el número o buscalo en la lista de tus pedidos.',
  },

  /** `/cuenta/direcciones`. */
  addresses: {
    title: 'Tus direcciones',
    empty: 'No tenés direcciones guardadas',
    emptyText: 'Guardá una para completar el envío más rápido en el checkout.',
    add: 'Agregar dirección',
    edit: 'Editar',
    remove: 'Borrar',
    confirmRemove: '¿Borrar esta dirección?',
    confirmRemoveYes: 'Sí, borrar',
    cancel: 'Cancelar',
    save: 'Guardar dirección',
    newTitle: 'Dirección nueva',
    editTitle: 'Editar dirección',
    defaultTag: 'Predeterminada',
    untitled: 'Dirección',
    label: 'Nombre (opcional)',
    labelPlaceholder: 'Casa, Trabajo…',
    street: 'Calle',
    number: 'Número',
    numberPlaceholder: '1234 o S/N',
    apartment: 'Piso / depto (opcional)',
    postalCode: 'Código postal',
    city: 'Ciudad',
    province: 'Provincia',
    provincePlaceholder: 'Elegí una provincia',
    isDefault: 'Usar como dirección predeterminada',
  },
} as const

/** Estado de un pedido, como se muestra al cliente. */
export const ORDER_STATUS_LABELS: Readonly<Record<OrderStatus, string>> = {
  pending_payment: 'Esperando el pago',
  paid: 'Pagado',
  preparing: 'En preparación',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  expired: 'Vencido',
  refunded: 'Reintegrado',
}

/** Estado del pago de un pedido, como se muestra al cliente. */
export const PAYMENT_STATUS_LABELS: Readonly<Record<PaymentStatus, string>> = {
  none: 'Sin pagar',
  pending: 'Pago pendiente',
  action_required: 'Falta verificar el pago',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  cancelled: 'Cancelado',
  refunded: 'Reintegrado',
  partially_refunded: 'Reintegrado en parte',
  in_dispute: 'En revisión',
  charged_back: 'Desconocido por el banco',
}

/** Medio de pago elegido en el checkout. */
export const PAYMENT_METHOD_LABELS: Readonly<Record<PaymentMethod, string>> = {
  mp_redirect: 'Mercado Pago',
  card: 'Tarjeta',
}

/** Forma de envío, con los mismos nombres que las opciones del checkout. */
export const SHIPPING_METHOD_LABELS: Readonly<Record<ShippingMethod, string>> = {
  home: 'Envío a domicilio',
  branch: 'Envío a sucursal',
  pickup: 'Retiro en persona',
}
