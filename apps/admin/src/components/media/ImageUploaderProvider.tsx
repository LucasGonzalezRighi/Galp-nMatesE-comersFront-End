import type { ReactNode } from 'react'
import { useMemo } from 'react'
import type { ImageUploader } from './media.types'
import { ImageUploaderContext } from './image-uploader-context'

/** Props de {@link ImageUploaderProvider}. */
export interface ImageUploaderProviderProps {
  /** El uploader del modo: `createImageUploader(contexto del router)`. */
  uploader: ImageUploader
  /**
   * Se llama cuando una subida falla porque venció la sesión (`401` al pedir la firma), para que
   * la estructura abra "Tu sesión venció". La foto queda en error con "Reintentar".
   */
  onUnauthorized?: () => void
  /** Lo que puede subir fotos. */
  children: ReactNode
}

/**
 * Reparte el uploader de fotos a todo el dashboard (`useImageUploader`, `useImageUploads`,
 * `useSingleImageUpload`).
 */
export function ImageUploaderProvider({
  uploader,
  onUnauthorized,
  children,
}: ImageUploaderProviderProps): ReactNode {
  const value = useMemo(
    () => ({ uploader, onUnauthorized: onUnauthorized ?? null }),
    [uploader, onUnauthorized],
  )
  return <ImageUploaderContext value={value}>{children}</ImageUploaderContext>
}
