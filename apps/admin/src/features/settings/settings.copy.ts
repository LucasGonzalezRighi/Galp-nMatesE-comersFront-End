import type { SellerLegalField, ShippingMethod } from '@galpon/domain'

/** Textos de la pantalla de ajustes. */
export const SETTINGS_COPY = {
  title: 'Ajustes',
  loading: 'Cargando los ajustes…',
  loadError: 'No pudimos cargar los ajustes.',
  saved: 'Ajustes guardados.',
  saveError: 'No pudimos guardar los ajustes. Probá de nuevo.',
  kit: {
    title: 'Kit',
    discount: 'Descuento del kit (%)',
    discountHint: 'De 0 a 30. Se aplica a la suma de las tres piezas.',
  },
  shipping: {
    title: 'Envíos',
    /** Nombre fijo de cada método (el cliente lo ve así; no se edita). */
    methods: {
      home: 'Envío a domicilio',
      branch: 'Envío a sucursal',
      pickup: 'Retiro en persona',
    } satisfies Record<ShippingMethod, string>,
    enabled: 'Habilitado',
    cost: 'Costo',
    free: 'Gratis',
    eta: 'Plazo',
    etaPlaceholder: '3 a 6 días hábiles',
  },
  installments: {
    title: 'Cuotas',
    max: 'Cuotas sin interés',
    maxHint: 'De 1 a 12.',
    showOnProduct: 'Mostrar las cuotas en la ficha',
  },
  tax: {
    title: 'Precio sin impuestos nacionales',
    description: 'Ley 27.743',
    showNetPrice: 'Mostrar el precio sin impuestos nacionales',
    vatRate: 'Alícuota de IVA (%)',
    vatRateHint: 'Con decimales si hace falta: "21" o "10,5".',
    taxCondition: 'Condición frente al IVA',
  },
  seller: {
    title: 'Vendedor y atención al cliente',
    description: 'Disposición 954/2025',
    legalName: 'Razón social o nombre',
    cuit: 'CUIT',
    address: 'Domicilio legal',
    phone: 'Teléfono o canal alternativo (opcional)',
    supportArea: 'Área responsable',
    supportHours: 'Horario de atención',
    supportHoursHint: 'Si la atención es solo electrónica, al menos 8 horas en días hábiles.',
    dataFiscalUrl: 'Data Fiscal (ARCA)',
    dataFiscalHint:
      'Pegá el código que te da ARCA (Formulario 960/D, opción "Banner en sitio web") o solo su enlace. La tienda muestra el logo oficial en el pie.',
    note: 'Estos datos se muestran en el pie, en Contacto y dentro de los textos legales. Revisalos con tu contador.',
  },
  consumer: {
    title: 'Defensa del consumidor',
    description: 'Ley 2244 (CABA) y Ventanilla Federal Única',
    cabaUrl: 'Enlace de Defensa al Consumidor de la Ciudad',
    nationalUrl: 'Enlace del formulario nacional de reclamos',
    hint: 'Son los enlaces oficiales y la tienda los muestra siempre en el pie. Cambialos solo si el organismo cambia la dirección.',
  },
  /** Aviso de los datos legales del vendedor que faltan (`MissingLegalDataNotice`). */
  missingLegal: {
    title: 'Faltan datos legales del vendedor',
    text: 'La tienda los muestra en el pie y dentro de los textos legales. Mientras falten, esos textos quedan incompletos.',
    action: 'Completar en Ajustes',
    labels: {
      legalName: 'Razón social',
      cuit: 'CUIT',
      taxCondition: 'Condición frente al IVA',
      address: 'Domicilio legal',
      supportArea: 'Área responsable',
      supportHours: 'Horario de atención',
      dataFiscalUrl: 'Data Fiscal (ARCA)',
    } satisfies Record<SellerLegalField, string>,
  },
  contact: {
    title: 'Contacto',
    email: 'Email de contacto',
  },
  stock: {
    title: 'Stock',
    lowStockThreshold: 'Umbral de poco stock',
    lowStockThresholdHint:
      'Un producto publicado cuenta como con poco stock cuando le quedan estas unidades o menos.',
  },
} as const
