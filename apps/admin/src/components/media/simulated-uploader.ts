import type { ApiClient } from '@galpon/api-client'
import { MAX_MOCK_MEDIA_LENGTH } from '@galpon/api-client/mock'
import type { RegisterMockImage } from '../../lib/api'
import type { ImageUploader } from './media.types'
import type { ImageSize } from './validate-image-file'
import { delay, throwIfAborted } from './abort'
import { MediaUploadError } from './media.types'
import { requestSignature, toUploadError } from './request-signature'
import { decodeImage } from './validate-image-file'

/** Primera reducción: lado mayor de 640 px en calidad 0,8. */
const FIRST_PASS = { maxSide: 640, quality: 0.8 } as const

/** Si la primera pasa del máximo: lado mayor de 480 px en calidad 0,6. */
const SECOND_PASS = { maxSide: 480, quality: 0.6 } as const

/** Pasos del avance simulado (20, 40, 60, 80 y 100 %). */
const PROGRESS_STEPS = 5

/** Prefijo del nombre de archivo que hace fallar el primer intento (para probar "Reintentar"). */
const FAILING_PREFIX = 'error-'

/** Opciones de {@link createSimulatedUploader}. */
export interface SimulatedUploaderOptions {
  /** Cliente de la API simulada (pide la firma: así se ejercitan la sesión y el CSRF). */
  api: ApiClient
  /** Registra la foto reducida en la base simulada (`POST /__mock/media`). */
  registerMockImage: RegisterMockImage
  /** Cuánto dura el avance simulado, en milisegundos; por omisión 600. */
  durationMs?: number
}

/**
 * Dibuja la foto reducida (sin agrandarla) y la devuelve como data URL: WebP o, si el navegador
 * no lo da, JPEG.
 *
 * @param source - La foto abierta.
 * @param size - Sus medidas originales.
 * @param pass - Lado mayor y calidad.
 * @returns El data URL.
 * @throws {Error} Si el navegador no da un contexto 2D.
 */
function drawReduced(
  source: CanvasImageSource,
  size: ImageSize,
  pass: { maxSide: number; quality: number },
): string {
  const scale = Math.min(1, pass.maxSide / Math.max(size.width, size.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(size.width * scale))
  canvas.height = Math.max(1, Math.round(size.height * scale))
  const context = canvas.getContext('2d')
  if (context === null) throw new Error('El navegador no permite reducir la foto.')
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  const webp = canvas.toDataURL('image/webp', pass.quality)
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', pass.quality)
}

/**
 * Reduce la foto para guardarla en la base simulada: lado mayor de 640 px en calidad 0,8 y, si
 * pasa del máximo que acepta `POST /__mock/media` (`MAX_MOCK_MEDIA_LENGTH`, 200 000
 * caracteres), 480 px en calidad 0,6 (refinamiento 2 del plan P4).
 *
 * @param file - La foto.
 * @returns El data URL reducido y las medidas de la foto original.
 */
async function reduce(file: File): Promise<{ dataUrl: string; size: ImageSize }> {
  const image = await decodeImage(file)
  try {
    const size = { width: image.width, height: image.height }
    const first = drawReduced(image.source, size, FIRST_PASS)
    const dataUrl =
      first.length <= MAX_MOCK_MEDIA_LENGTH ? first : drawReduced(image.source, size, SECOND_PASS)
    return { dataUrl, size }
  } finally {
    image.release()
  }
}

/**
 * Crea el uploader del modo de prueba. Pide la firma (así la sesión y el CSRF también se
 * ejercitan), reduce la foto con `canvas`, avanza el progreso en 5 pasos durante `durationMs`,
 * la registra con `registerMockImage({ folder, dataUrl, width, height })` (medidas del original)
 * y devuelve `{ publicId, url: dataUrl, width, height }`.
 *
 * Si el nombre del archivo empieza con `error-`, el primer intento de ese archivo falla con
 * `simulated` y el reintento sale bien. Se cancela con `signal`.
 *
 * @param options - Ver {@link SimulatedUploaderOptions}.
 * @returns El uploader.
 * @throws {RangeError} Si `durationMs` no es un número finito desde 0.
 */
export function createSimulatedUploader({
  api,
  registerMockImage,
  durationMs = 600,
}: SimulatedUploaderOptions): ImageUploader {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    throw new RangeError(
      `La duración de la subida simulada tiene que ser un número de milisegundos desde 0; se recibió ${String(durationMs)}.`,
    )
  }
  const stepMs = durationMs / PROGRESS_STEPS
  // Archivos `error-*` que ya fallaron una vez: el reintento (el mismo File) sale bien.
  const failedOnce = new WeakSet<File>()

  return {
    async upload(file, { purpose, signal, onProgress }) {
      if (!(file instanceof File)) throw new RangeError('Para subir una foto hace falta un File.')
      throwIfAborted(signal)
      const signature = await requestSignature(api, purpose)
      throwIfAborted(signal)
      const { dataUrl, size } = await reduce(file)

      for (let step = 1; step < PROGRESS_STEPS; step += 1) {
        await delay(stepMs, signal)
        onProgress?.(step * (100 / PROGRESS_STEPS))
      }
      await delay(stepMs, signal)
      if (file.name.startsWith(FAILING_PREFIX) && !failedOnce.has(file)) {
        failedOnce.add(file)
        throw new MediaUploadError({ reason: 'simulated' })
      }

      let registered
      try {
        registered = await registerMockImage({ folder: signature.folder, dataUrl, ...size })
      } catch (error) {
        throw toUploadError(error)
      }
      throwIfAborted(signal)
      onProgress?.(100)
      return { publicId: registered.publicId, url: dataUrl, ...size }
    },
  }
}
