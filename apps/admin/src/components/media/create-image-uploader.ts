import type { ImageUploader, ImageUploaderConfig } from './media.types'
import { createCloudinaryUploader } from './cloudinary-uploader'
import { createSimulatedUploader } from './simulated-uploader'

/**
 * Elige cómo se suben las fotos según el modo de la API: a Cloudinary en `live` y simulada (un
 * data URL reducido en la base de prueba) en `mock`. Recibe el contexto del router, o cualquier
 * objeto con su forma.
 *
 * @param config - `apiMode`, `api` y `registerMockImage` (ver {@link ImageUploaderConfig}).
 * @returns El uploader del modo.
 * @throws {RangeError} Si `apiMode` es `mock` y falta `registerMockImage`, o si `apiMode` no es
 *   `mock` ni `live`.
 */
export function createImageUploader({
  apiMode,
  api,
  registerMockImage,
}: ImageUploaderConfig): ImageUploader {
  if (apiMode === 'live') return createCloudinaryUploader({ api })
  if ((apiMode as string) !== 'mock') {
    throw new RangeError(
      `El modo de la API tiene que ser "mock" o "live"; se recibió "${apiMode}".`,
    )
  }
  if (registerMockImage === null) {
    throw new RangeError('En modo de prueba, createImageUploader necesita registerMockImage.')
  }
  return createSimulatedUploader({ api, registerMockImage })
}
