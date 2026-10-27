/** Para qué es una foto: define la carpeta de Cloudinary y el cupo. */
export const MEDIA_PURPOSES = ['product', 'category', 'partner', 'site'] as const

/** Uso de una foto. */
export type MediaPurpose = (typeof MEDIA_PURPOSES)[number]

/** Carpeta de Cloudinary de cada uso; la subida tiene que mandar este mismo valor en `folder`. */
export const MEDIA_FOLDERS = {
  product: 'galpon/productos',
  category: 'galpon/lineas',
  partner: 'galpon/socios',
  site: 'galpon/sitio',
} as const satisfies Record<MediaPurpose, string>

/**
 * Reglas que cumple una foto antes de subirla (spec 11.4): JPEG, PNG o WebP, hasta 10 MB y al
 * menos 800 px del lado menor.
 */
export const IMAGE_UPLOAD_RULES = {
  acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxBytes: 10_485_760,
  minShortSide: 800,
} as const

/** Cupo de fotos de cada uso: un producto lleva hasta 8 y el resto, una. */
export const MAX_IMAGES = {
  product: 8,
  category: 1,
  partner: 1,
  site: 1,
} as const satisfies Record<MediaPurpose, number>

/** Datos de un archivo elegido para subir; las medidas faltan mientras no se leyeron. */
export interface ImageFileInfo {
  /** Tipo MIME del archivo (`File.type`). */
  type: string
  /** Peso en bytes (`File.size`). */
  size: number
  /** Ancho en píxeles, si ya se leyó. */
  width?: number
  /** Alto en píxeles, si ya se leyó. */
  height?: number
}

/** Regla que no cumple una foto: el formato, el peso o las medidas. */
export type ImageFileProblem = 'type' | 'size' | 'dimensions'

/**
 * Indica si un número es un entero mayor a 0.
 *
 * @param value - Número a revisar.
 * @returns `true` si es un entero positivo.
 */
function isPositiveInt(value: number): boolean {
  return Number.isInteger(value) && value > 0
}

/**
 * Revisa una foto contra {@link IMAGE_UPLOAD_RULES}, en orden: formato, peso y medidas.
 *
 * Sin medidas revisa solo el formato y el peso (las medidas se leen después de abrir el archivo).
 *
 * @param file - Tipo, peso y, si ya se leyeron, ancho y alto.
 * @returns La primera regla que no cumple, o `null` si se puede subir.
 * @throws {RangeError} Si el peso no es un entero desde 0, si las medidas no son enteros mayores a
 *   0 o si viene solo una de las dos.
 * @example
 * checkImageFile({ type: 'image/gif', size: 1000 }) // 'type'
 * checkImageFile({ type: 'image/jpeg', size: 1000, width: 799, height: 1200 }) // 'dimensions'
 */
export function checkImageFile({
  type,
  size,
  width,
  height,
}: ImageFileInfo): ImageFileProblem | null {
  if (!Number.isInteger(size) || size < 0) {
    throw new RangeError(
      `El peso de la foto tiene que ser un entero de bytes desde 0; se recibió ${String(size)}.`,
    )
  }
  let shortSide: number | null = null
  if (width !== undefined && height !== undefined) {
    if (!isPositiveInt(width) || !isPositiveInt(height)) {
      throw new RangeError(
        `Las medidas de la foto tienen que ser enteros mayores a 0; se recibió ${String(width)} × ${String(height)}.`,
      )
    }
    shortSide = Math.min(width, height)
  } else if (width !== undefined || height !== undefined) {
    throw new RangeError('Pasá el ancho y el alto de la foto juntos, o ninguno de los dos.')
  }
  if (!(IMAGE_UPLOAD_RULES.acceptedTypes as readonly string[]).includes(type)) return 'type'
  if (size > IMAGE_UPLOAD_RULES.maxBytes) return 'size'
  if (shortSide !== null && shortSide < IMAGE_UPLOAD_RULES.minShortSide) return 'dimensions'
  return null
}
