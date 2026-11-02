import type { ApiClient, MediaPurpose } from '@galpon/api-client'
import type { RegisterMockImage } from '../../lib/api'
import { MEDIA_COPY } from './media.copy'

/** Foto ya subida: lo que se guarda en un producto, una línea o un socio (más el texto alternativo). */
export interface UploadedImage {
  /** Identificador de la foto en Cloudinary (o `{carpeta}/mock-{uuid}` en el modo de prueba). */
  publicId: string
  /** Dirección para mostrarla: la de Cloudinary, o el data URL reducido en el modo de prueba. */
  url: string
  /** Ancho en píxeles de la foto original. */
  width: number
  /** Alto en píxeles de la foto original. */
  height: number
}

/** Opciones de cada subida. */
export interface UploadOptions {
  /** Para qué es la foto: define la carpeta y la firma. */
  purpose: MediaPurpose
  /** Cancela la subida: la promesa se rechaza con un `DOMException` `AbortError`. */
  signal?: AbortSignal
  /** Recibe el avance, un entero de 0 a 100. */
  onProgress?: (progress: number) => void
}

/** Sube una foto: a Cloudinary en vivo, o a la base simulada en el modo de prueba. */
export interface ImageUploader {
  /**
   * Sube `file` y devuelve la foto subida. Cada llamada pide una firma nueva (también al
   * reintentar).
   *
   * @throws {MediaUploadError} Si la subida falla, se corta, tarda demasiado o venció la sesión.
   * @throws {DOMException} `AbortError` si se cancela con `signal`.
   */
  upload(file: File, options: UploadOptions): Promise<UploadedImage>
}

/** Estado de una foto en la cola: subiendo, con error o lista. */
export type UploadStatus = 'uploading' | 'error' | 'done'

/** Una foto de la cola de subidas, con lo que necesita `ImageTile` para mostrarla. */
export interface UploadItem {
  /** Identificador de la foto en la cola. */
  id: string
  /** Nombre del archivo elegido. */
  fileName: string
  /** URL `blob:` de la vista previa; se revoca al quitar la foto o al desmontar. */
  previewUrl: string
  /** Estado de la subida. */
  status: UploadStatus
  /** Avance de 0 a 100. */
  progress: number
  /** Mensaje del error, o `null` si no falló. */
  errorMessage: string | null
  /** La foto subida, o `null` mientras no terminó. */
  result: UploadedImage | null
}

/**
 * Por qué falló una subida: el servicio la rechazó (`4xx` / `5xx`), se cortó la conexión, tardó
 * demasiado, es el fallo de prueba de un archivo `error-*` o venció la sesión al pedir la firma.
 */
export type MediaUploadReason = 'rejected' | 'network' | 'timeout' | 'simulated' | 'unauthorized'

/** Datos para construir un {@link MediaUploadError}. */
export interface MediaUploadErrorInit {
  /** Por qué falló. */
  reason: MediaUploadReason
  /** Estado HTTP de la respuesta, o `null` si no hubo. Obligatorio con `rejected`. */
  status?: number | null
  /** Error original (por ejemplo, el `ApiError` de la firma). */
  cause?: unknown
}

/**
 * Mensaje en español de cada motivo de error, listo para mostrar.
 *
 * @param reason - Motivo del error.
 * @param status - Estado HTTP (solo lo usa `rejected`).
 * @returns El texto de `media.copy.ts`.
 */
function messageFor(reason: MediaUploadReason, status: number | null): string {
  switch (reason) {
    case 'rejected':
      return MEDIA_COPY.rejected(status ?? 0)
    case 'network':
      return MEDIA_COPY.network
    case 'timeout':
      return MEDIA_COPY.timeout
    case 'simulated':
      return MEDIA_COPY.simulated
    case 'unauthorized':
      return MEDIA_COPY.sessionExpired
  }
}

/** Error de una subida de foto, con el motivo, el estado HTTP y el mensaje listo para mostrar. */
export class MediaUploadError extends Error {
  /** Por qué falló. */
  readonly reason: MediaUploadReason
  /** Estado HTTP de la respuesta, o `null` si no hubo respuesta. */
  readonly status: number | null

  /**
   * @param init - Ver {@link MediaUploadErrorInit}.
   * @throws {RangeError} Si `status` no es un estado HTTP (entero de 100 a 599) o falta con
   *   `rejected`.
   */
  constructor({ reason, status = null, cause }: MediaUploadErrorInit) {
    if (status !== null && (!Number.isInteger(status) || status < 100 || status > 599)) {
      throw new RangeError(
        `El estado de un MediaUploadError tiene que ser un entero de 100 a 599; se recibió ${String(status)}.`,
      )
    }
    if (reason === 'rejected' && status === null) {
      throw new RangeError('Un MediaUploadError con motivo "rejected" necesita el estado HTTP.')
    }
    super(messageFor(reason, status), cause === undefined ? undefined : { cause })
    this.name = 'MediaUploadError'
    this.reason = reason
    this.status = status
  }
}

/**
 * Lo que necesita `createImageUploader` para elegir cómo subir: un objeto con la forma del
 * contexto del router (`apiMode`, `api` y `registerMockImage`).
 */
export interface ImageUploaderConfig {
  /** `mock` simula la subida; `live` sube a Cloudinary. */
  apiMode: 'mock' | 'live'
  /** Cliente de la API (pide la firma de cada subida). */
  api: ApiClient
  /** Registro de fotos simuladas: obligatorio en `mock`, `null` en `live`. */
  registerMockImage: RegisterMockImage | null
}
