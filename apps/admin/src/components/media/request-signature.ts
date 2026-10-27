import type { ApiClient, MediaPurpose, MediaSignature } from '@galpon/api-client'
import { createMediaSignature, isApiError } from '@galpon/api-client'
import { MediaUploadError } from './media.types'

/**
 * Convierte el `401` de la API (venció la sesión) en un {@link MediaUploadError} `unauthorized`;
 * cualquier otro error sigue igual.
 *
 * @param error - Lo que atrapó un `catch` al hablar con la API.
 * @returns El error a relanzar.
 */
export function toUploadError(error: unknown): unknown {
  if (isApiError(error) && error.kind === 'unauthorized') {
    return new MediaUploadError({
      reason: 'unauthorized',
      status: error.status ?? 401,
      cause: error,
    })
  }
  return error
}

/**
 * Pide al back la firma de una subida (`POST /admin/media/signature`). Se llama en cada intento,
 * también al reintentar, porque la firma lleva la hora.
 *
 * @param api - Cliente de la API, con la sesión del admin y el token CSRF.
 * @param purpose - Para qué es la foto.
 * @returns La firma: `cloudName`, `apiKey`, `timestamp`, `signature` y `folder`.
 * @throws {RangeError} Si `purpose` no es un uso de foto.
 * @throws {MediaUploadError} `unauthorized` si venció la sesión.
 * @throws {ApiError} Si la API falla por otro motivo (CSRF, red, servidor).
 */
export async function requestSignature(
  api: ApiClient,
  purpose: MediaPurpose,
): Promise<MediaSignature> {
  try {
    return await createMediaSignature(api, purpose)
  } catch (error) {
    throw toUploadError(error)
  }
}
