import { checkImageFile } from '@galpon/domain'
import { MEDIA_COPY } from './media.copy'

/** Ancho y alto de una foto, en píxeles. */
export interface ImageSize {
  /** Ancho en píxeles. */
  width: number
  /** Alto en píxeles. */
  height: number
}

/** Una foto abierta, lista para dibujar en un `canvas`. */
export interface DecodedImage extends ImageSize {
  /** Lo que recibe `drawImage`: un `ImageBitmap` o una `Image`. */
  source: CanvasImageSource
  /** Libera la memoria de la foto (cierra el bitmap o revoca la URL `blob:`). */
  release: () => void
}

/**
 * Abre la foto con una `Image` y una URL `blob:` (el respaldo de `createImageBitmap`).
 *
 * @param file - La foto.
 * @returns La foto abierta; `release` revoca la URL.
 */
function decodeWithImage(file: Blob): Promise<DecodedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      resolve({
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        release: () => {
          URL.revokeObjectURL(url)
        },
      })
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(MEDIA_COPY.unreadable))
    }
    image.src = url
  })
}

/**
 * Abre una foto para leer sus medidas o dibujarla: con `createImageBitmap` y, si el navegador no
 * lo tiene o no puede, con una `Image` y una URL `blob:`.
 *
 * @param file - La foto.
 * @returns La foto abierta; quien la usa llama a `release` al terminar.
 * @throws {RangeError} Si `file` no es un `Blob`.
 * @throws {Error} Con "No pudimos leer la foto." (como rechazo) si no se puede abrir.
 */
export async function decodeImage(file: Blob): Promise<DecodedImage> {
  if (!(file instanceof Blob)) {
    throw new RangeError('Para leer una foto hace falta un archivo (File o Blob).')
  }
  if ('createImageBitmap' in globalThis) {
    try {
      const bitmap = await createImageBitmap(file)
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => {
          bitmap.close()
        },
      }
    } catch {
      // Algunos navegadores no abren ciertos archivos con createImageBitmap: se prueba con Image.
    }
  }
  return decodeWithImage(file)
}

/**
 * Lee el ancho y el alto de una foto.
 *
 * @param file - La foto.
 * @returns Sus medidas en píxeles.
 * @throws {RangeError} Si `file` no es un `Blob`.
 * @throws {Error} Con "No pudimos leer la foto." (como rechazo) si no se puede abrir o no tiene
 *   medidas.
 */
export async function readImageSize(file: Blob): Promise<ImageSize> {
  const image = await decodeImage(file)
  image.release()
  const { width, height } = image
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error(MEDIA_COPY.unreadable)
  }
  return { width, height }
}

/**
 * Revisa una foto antes de subirla con las reglas de `@galpon/domain` (`checkImageFile`): primero
 * el formato y el peso (sin abrirla) y después las medidas.
 *
 * @param file - La foto elegida.
 * @returns El mensaje de `media.copy.ts` de la primera regla que no cumple, o `null` si se puede
 *   subir.
 * @throws {RangeError} Si `file` no es un `File`.
 */
export async function checkFile(file: File): Promise<string | null> {
  if (!(file instanceof File)) {
    throw new RangeError('checkFile necesita el archivo elegido (un File).')
  }
  const early = checkImageFile({ type: file.type, size: file.size })
  if (early === 'type') return MEDIA_COPY.type
  if (early === 'size') return MEDIA_COPY.size

  let size: ImageSize
  try {
    size = await readImageSize(file)
  } catch {
    return MEDIA_COPY.unreadable
  }
  const problem = checkImageFile({ type: file.type, size: file.size, ...size })
  return problem === null ? null : MEDIA_COPY.dimensions(size.width, size.height)
}
