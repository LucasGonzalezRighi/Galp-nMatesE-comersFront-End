import type { ShippingMethod } from '@galpon/domain'

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
    taxCondition: 'Condición fiscal',
  },
  seller: {
    title: 'Vendedor y atención al cliente',
    description: 'Disposición 954/2025',
    legalName: 'Razón social o nombre',
    cuit: 'CUIT',
    address: 'Domicilio',
    phone: 'Teléfono o canal alternativo',
    supportArea: 'Área responsable',
    supportHours: 'Horario de atención',
    supportHoursHint: 'Si la atención es solo electrónica, al menos 8 horas en días hábiles.',
    dataFiscalUrl: 'Link de Data Fiscal (ARCA)',
    note: 'Estos datos se muestran en el pie y en Contacto. Revisalos con tu contador.',
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
