import type { ApiClient, MediaSignature } from '@galpon/api-client'
import type { ImageUploader, UploadedImage, UploadOptions } from './media.types'
import { createAbortError, throwIfAborted } from './abort'
import { MediaUploadError } from './media.types'
import { requestSignature } from './request-signature'

/** Tiempo máximo de una subida a Cloudinary: 120 s. */
export const CLOUDINARY_UPLOAD_TIMEOUT_MS = 120_000

/** Origen de la API de subida de Cloudinary (el mismo que permite `connect-src` en la CSP). */
const CLOUDINARY_API = 'https://api.cloudinary.com'

/** Opciones de {@link createCloudinaryUploader}. */
export interface CloudinaryUploaderOptions {
  /** Cliente de la API del dashboard (pide la firma de cada subida). */
  api: ApiClient
}

/** Es `true` si `value` es un entero mayor a 0. */
function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

/**
 * Lee la foto de la respuesta de Cloudinary (`public_id`, `secure_url`, `width` y `height`).
 *
 * @param text - Cuerpo de la respuesta.
 * @returns La foto, o `null` si el cuerpo no la trae.
 */
function parseUploaded(text: string): UploadedImage | null {
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return null
  }
  if (typeof body !== 'object' || body === null) return null
  const { public_id, secure_url, width, height } = body as Record<string, unknown>
  if (typeof public_id !== 'string' || public_id === '') return null
  if (typeof secure_url !== 'string' || !secure_url.startsWith('https://')) return null
  if (!isPositiveInt(width) || !isPositiveInt(height)) return null
  return { publicId: public_id, url: secure_url, width, height }
}

/**
 * Manda la foto a Cloudinary con `XMLHttpRequest` (para tener el progreso) y exactamente los
 * parámetros firmados.
 *
 * @param file - La foto.
 * @param signature - La firma del back.
 * @param options - Señal de cancelación y avance.
 * @returns La foto subida.
 */
function send(
  file: File,
  signature: MediaSignature,
  { signal, onProgress }: Omit<UploadOptions, 'purpose'>,
): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const onAbort = () => {
      xhr.abort()
    }
    const settle = (finish: () => void) => {
      signal?.removeEventListener('abort', onAbort)
      finish()
    }

    xhr.open(
      'POST',
      `${CLOUDINARY_API}/v1_1/${encodeURIComponent(signature.cloudName)}/image/upload`,
    )
    xhr.timeout = CLOUDINARY_UPLOAD_TIMEOUT_MS
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return
      // El 100 % se avisa con la respuesta: mandar los bytes no es haber terminado.
      onProgress?.(Math.min(99, Math.round((event.loaded / event.total) * 100)))
    }
    xhr.onload = () => {
      settle(() => {
        // Un estado fuera de 100–599 (por ejemplo 0) no es una respuesta HTTP sino un corte: así
        // `MediaUploadError` no lanza dentro del manejador y la promesa siempre termina.
        if (!Number.isInteger(xhr.status) || xhr.status < 100 || xhr.status > 599) {
          reject(new MediaUploadError({ reason: 'network' }))
          return
        }
        const uploaded =
          xhr.status >= 200 && xhr.status < 300 ? parseUploaded(xhr.responseText) : null
        if (uploaded === null) {
          reject(new MediaUploadError({ reason: 'rejected', status: xhr.status }))
          return
        }
        onProgress?.(100)
        resolve(uploaded)
      })
    }
    xhr.onerror = () => {
      settle(() => {
        reject(new MediaUploadError({ reason: 'network' }))
      })
    }
    xhr.ontimeout = () => {
      settle(() => {
        reject(new MediaUploadError({ reason: 'timeout' }))
      })
    }
    xhr.onabort = () => {
      settle(() => {
        reject(createAbortError())
      })
    }
    signal?.addEventListener('abort', onAbort, { once: true })

    const form = new FormData()
    form.append('file', file)
    form.append('api_key', signature.apiKey)
    form.append('timestamp', String(signature.timestamp))
    form.append('signature', signature.signature)
    form.append('folder', signature.folder)
    xhr.send(form)
  })
}

/**
 * Crea el uploader de Cloudinary (modo `live`). En cada intento, también al reintentar, pide la
 * firma al back (`createMediaSignature`) y sube directo a
 * `https://api.cloudinary.com/v1_1/{cloudName}/image/upload` con `XMLHttpRequest` y un `FormData`
 * de exactamente `file`, `api_key`, `timestamp`, `signature` y `folder` (spec 11.4). No pasa por
 * el cliente de la API.
 *
 * El avance llega por `xhr.upload.onprogress`; la señal llama a `xhr.abort()`; el tiempo máximo es
 * de 120 s. Un `4xx` / `5xx` rechaza con `rejected`, un corte (o una respuesta con un estado
 * fuera de 100–599, como 0) con `network`, el tiempo con `timeout` y el `401` de la firma con
 * `unauthorized`.
 *
 * @param options - Ver {@link CloudinaryUploaderOptions}.
 * @returns El uploader.
 */
export function createCloudinaryUploader({ api }: CloudinaryUploaderOptions): ImageUploader {
  return {
    async upload(file, { purpose, signal, onProgress }) {
      if (!(file instanceof File)) throw new RangeError('Para subir una foto hace falta un File.')
      throwIfAborted(signal)
      const signature = await requestSignature(api, purpose)
      throwIfAborted(signal)
      return send(file, signature, { signal, onProgress })
    },
  }
}
