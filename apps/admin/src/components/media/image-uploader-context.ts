import { createContext, useContext } from 'react'
import type { ImageUploader } from './media.types'

/** Lo que reparte `ImageUploaderProvider`. */
export interface ImageUploaderContextValue {
  /** El uploader del modo (ver `createImageUploader`). */
  uploader: ImageUploader
  /** Se llama cuando una subida falla porque venció la sesión (`401`), o `null`. */
  onUnauthorized: (() => void) | null
}

/** Contexto de React con el uploader de fotos; lo llena `ImageUploaderProvider`. */
export const ImageUploaderContext = createContext<ImageUploaderContextValue | null>(null)

/**
 * Devuelve lo que reparte el proveedor (el uploader y el aviso de sesión vencida).
 *
 * @returns El valor del contexto.
 * @throws {Error} Si no hay un `ImageUploaderProvider` más arriba.
 */
export function useImageUploaderContext(): ImageUploaderContextValue {
  const value = useContext(ImageUploaderContext)
  if (value === null) {
    throw new Error(
      'useImageUploader necesita un <ImageUploaderProvider> más arriba (lo monta la estructura del dashboard).',
    )
  }
  return value
}

/**
 * Devuelve el uploader de fotos del dashboard.
 *
 * @returns El uploader que puso `ImageUploaderProvider`.
 * @throws {Error} Si no hay un `ImageUploaderProvider` más arriba.
 */
export function useImageUploader(): ImageUploader {
  return useImageUploaderContext().uploader
}
