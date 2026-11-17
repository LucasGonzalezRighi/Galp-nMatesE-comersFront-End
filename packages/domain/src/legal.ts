import { formatCuit } from './tax'

/** Los documentos legales de la tienda, en el orden en que se listan. */
export const LEGAL_DOCUMENTS = ['terms', 'privacy', 'cookies', 'returns'] as const

/** Un documento legal: términos, privacidad, cookies o devoluciones. */
export type LegalDocument = (typeof LEGAL_DOCUMENTS)[number]

/**
 * Indica si un texto es la clave de un documento legal.
 *
 * @param value - El texto a revisar (por ejemplo, el segmento de una ruta).
 * @returns `true` si es una de las claves de `LEGAL_DOCUMENTS`.
 * @example
 * isLegalDocument('cookies') // true
 */
export function isLegalDocument(value: string): value is LegalDocument {
  return (LEGAL_DOCUMENTS as readonly string[]).includes(value)
}

/**
 * Las claves de los marcadores `{{clave}}` que un documento legal puede usar; la tienda los
 * reemplaza por los datos del vendedor al dibujar (LA-2).
 */
export const LEGAL_MARKERS = [
  'razon_social',
  'cuit',
  'condicion_iva',
  'domicilio',
  'email',
  'telefono',
  'area_atencion',
  'horario_atencion',
] as const

/** La clave de un marcador de datos del vendedor. */
export type LegalMarker = (typeof LEGAL_MARKERS)[number]

/** Datos del vendedor de los ajustes públicos (`PublicSettings['seller']`); `null` si faltan. */
export interface SellerData {
  /** Razón social. */
  legalName: string | null
  /** CUIT, con o sin guiones. */
  cuit: string | null
  /** Condición frente al IVA. */
  taxCondition: string | null
  /** Domicilio legal. */
  address: string | null
  /** Teléfono de atención (opcional). */
  phone: string | null
  /** Área de atención al cliente. */
  supportArea: string | null
  /** Horario de atención. */
  supportHours: string | null
  /** El `href` del código de Data Fiscal que entrega ARCA. */
  dataFiscalUrl: string | null
}

/** El valor de cada marcador; `null` si el dato falta. */
export type LegalMarkerValues = Readonly<Record<LegalMarker, string | null>>

/** Lo que `legalMarkerValues` necesita: el email de contacto y los datos del vendedor. */
export interface LegalMarkerSource {
  /** Email de contacto de la tienda. */
  contactEmail: string
  /** Datos del vendedor. */
  seller: SellerData
}

/** CUIT con guiones o solo con los 11 dígitos (lo que `formatCuit` acepta). */
const FORMATTABLE_CUIT = /^(?:\d{11}|\d{2}-\d{8}-\d)$/

function assertString(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new RangeError(`${name} tiene que ser un texto; se recibió ${typeof value}.`)
  }
}

function assertSeller(value: unknown): asserts value is SellerData {
  if (typeof value !== 'object' || value === null) {
    throw new RangeError('Faltan los datos del vendedor.')
  }
}

/**
 * Arma el valor de cada marcador a partir de los ajustes públicos.
 *
 * El CUIT va con guiones si son 11 dígitos y tal cual si no: acá nunca se lanza.
 *
 * @param source - El email de contacto y los datos del vendedor.
 * @returns Un valor por cada clave de `LEGAL_MARKERS`.
 * @throws {RangeError} Si falta el email de contacto o los datos del vendedor.
 * @example
 * legalMarkerValues({ contactEmail: 'hola@x.com', seller }).cuit // "20-12345678-6"
 */
export function legalMarkerValues(source: LegalMarkerSource): LegalMarkerValues {
  assertString(source.contactEmail, 'El email de contacto')
  assertSeller(source.seller)
  const { seller } = source
  const cuit =
    seller.cuit !== null && FORMATTABLE_CUIT.test(seller.cuit)
      ? formatCuit(seller.cuit)
      : seller.cuit
  return {
    razon_social: seller.legalName,
    cuit,
    condicion_iva: seller.taxCondition,
    domicilio: seller.address,
    email: source.contactEmail,
    telefono: seller.phone,
    area_atencion: seller.supportArea,
    horario_atencion: seller.supportHours,
  }
}

/** Los marcadores que usa un cuerpo, sin repetir y en orden de aparición. */
export interface LegalMarkerUse {
  /** Claves que están en `LEGAL_MARKERS`. */
  known: LegalMarker[]
  /** Claves que no existen, tal como están escritas (recortadas y sin las llaves). */
  unknown: string[]
}

/** Un marcador: `{{clave}}`, sin llaves adentro. */
const MARKER_PATTERN = /\{\{([^{}]*)\}\}/g

function isLegalMarker(value: string): value is LegalMarker {
  return (LEGAL_MARKERS as readonly string[]).includes(value)
}

/**
 * Busca los marcadores `{{clave}}` de un cuerpo legal.
 *
 * @param body - El cuerpo del documento.
 * @returns Las claves conocidas y las desconocidas, sin repetir y en orden de aparición.
 * @throws {RangeError} Si el cuerpo no es un texto.
 * @example
 * findLegalMarkers('{{cuit}} {{cuitt}}') // { known: ['cuit'], unknown: ['cuitt'] }
 */
export function findLegalMarkers(body: string): LegalMarkerUse {
  assertString(body, 'El cuerpo del documento')
  const known: LegalMarker[] = []
  const unknown: string[] = []
  for (const match of body.matchAll(MARKER_PATTERN)) {
    const key = (match[1] ?? '').trim()
    if (isLegalMarker(key)) {
      if (!known.includes(key)) known.push(key)
    } else if (!unknown.includes(key)) {
      unknown.push(key)
    }
  }
  return { known, unknown }
}

function withoutBraces(text: string): string {
  let result = text
  let previous: string
  do {
    previous = result
    result = result.replace(/\{\{|\}\}/g, '')
  } while (result !== previous)
  return result
}

/**
 * Reemplaza los marcadores de un cuerpo legal por los datos del vendedor.
 *
 * Una clave conocida con valor da el valor; una conocida sin valor (`null` o vacía) o una
 * desconocida da `missing`. Con `missing` vacío saca además los espacios que quedan antes de
 * `, . ; : )` y los espacios dobles. El resultado nunca contiene `{{` ni `}}`.
 *
 * @param body - El cuerpo del documento, con marcadores.
 * @param values - El valor de cada marcador (`legalMarkerValues`).
 * @param missing - El texto para un dato que falta (vacío en producción).
 * @returns El cuerpo sin marcadores.
 * @throws {RangeError} Si el cuerpo o el texto de faltante no son textos.
 * @example
 * resolveLegalMarkers('CUIT {{cuit}}', values, 'a completar por el vendedor')
 */
export function resolveLegalMarkers(
  body: string,
  values: LegalMarkerValues,
  missing: string,
): string {
  assertString(body, 'El cuerpo del documento')
  assertString(missing, 'El texto de dato faltante')
  const replaced = body.replace(MARKER_PATTERN, (_marker, rawKey: string) => {
    const key = rawKey.trim()
    const value = isLegalMarker(key) ? values[key] : null
    return value === null || value === '' ? missing : value
  })
  const clean = withoutBraces(replaced)
  if (missing !== '') return clean
  return clean.replace(/ +([,.;:)])/g, '$1').replace(/ {2,}/g, ' ')
}

/** Los datos del vendedor que la ley pide mostrar (LA-3); el teléfono es opcional y no está. */
export const SELLER_LEGAL_FIELDS = [
  'legalName',
  'cuit',
  'taxCondition',
  'address',
  'supportArea',
  'supportHours',
  'dataFiscalUrl',
] as const

/** Un dato legal obligatorio del vendedor. */
export type SellerLegalField = (typeof SELLER_LEGAL_FIELDS)[number]

/**
 * Lista los datos legales del vendedor que faltan.
 *
 * @param seller - Los datos del vendedor.
 * @returns Los campos en `null` o vacíos, en el orden de `SELLER_LEGAL_FIELDS`.
 * @throws {RangeError} Si faltan los datos del vendedor.
 * @example
 * missingSellerFields(seller) // ['cuit', 'dataFiscalUrl']
 */
export function missingSellerFields(seller: SellerData): SellerLegalField[] {
  assertSeller(seller)
  return SELLER_LEGAL_FIELDS.filter((field) => {
    const value = seller[field]
    return value === null || value.trim() === ''
  })
}

/** Los enlaces de fábrica de Defensa del Consumidor (CABA y Nación; research §2.7). */
export const DEFAULT_CONSUMER_LINKS = {
  cabaUrl: 'https://buenosaires.gob.ar/gobierno/atencion-ciudadana/defensa-al-consumidor',
  nationalUrl: 'https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario',
} as const

/** Origen del logo de Data Fiscal (lo único que la CSP de la tienda suma a `img-src`). */
export const DATA_FISCAL_LOGO_ORIGIN = 'https://www.afip.gob.ar'

/** El logo de Data Fiscal (F. 960/D), 239 × 327 px. */
export const DATA_FISCAL_LOGO_URL = 'https://www.afip.gob.ar/images/f960/DATAWEB.jpg'

/** El `href` de un `<a>` con comillas dobles o simples. */
const ANCHOR_HREF = /<a\b[^>]*?\shref\s*=\s*(["'])(.*?)\1/i

/**
 * Saca el enlace de Data Fiscal de lo que el vendedor pega: el código entero que entrega ARCA
 * o solo la URL.
 *
 * @param input - El código `<a … href="…">` o la URL.
 * @returns El `href` del código si lo trae; si no, el texto recortado.
 * @throws {RangeError} Si no es un texto.
 * @example
 * extractDataFiscalUrl('<a href="https://qr.afip.gob.ar/?qr=1">…</a>') // "https://qr.afip.gob.ar/?qr=1"
 */
export function extractDataFiscalUrl(input: string): string {
  assertString(input, 'El código de Data Fiscal')
  const match = ANCHOR_HREF.exec(input)
  if (match?.[2] !== undefined) return match[2].replace(/&amp;/g, '&').trim()
  return input.trim()
}
