import type { MediaPurpose } from '@galpon/api-client'
import type { UploadItem } from './media.types'
import { useImageUploads } from './use-image-uploads'

/** Opciones de {@link useSingleImageUpload}. */
export interface UseSingleImageUploadOptions {
  /** Para qué es la foto: define la carpeta y la firma. */
  purpose: MediaPurpose
}

/** La subida de una sola foto que devuelve {@link useSingleImageUpload}. */
export interface SingleImageUpload {
  /** La foto elegida, o `null` si no hay ninguna. */
  item: UploadItem | null
  /**
   * Valida los archivos y sube el primero que cumple las reglas, que reemplaza a la foto anterior
   * (revoca su `blob:`). Un archivo inválido no reemplaza nada.
   */
  add: (files: Iterable<File> | ArrayLike<File>) => Promise<void>
  /**
   * Cancela la subida en curso o quita la que falló (es una cola de una foto: cancelar es quitar,
   * en cualquier estado). Es lo que cablea el "Cancelar" y el "Quitar" de `SingleImageField`.
   */
  cancel: () => void
  /** Vuelve a subir la foto si quedó con error (pide una firma nueva). */
  retry: () => void
  /** Quita la foto (corta la subida si sigue y revoca su `blob:`). */
  remove: () => void
  /** `true` mientras la foto se está subiendo. */
  isUploading: boolean
  /** `true` si la foto quedó con error. */
  hasErrors: boolean
  /** Por qué no se tomó el último archivo, o `null`. */
  error: string | null
}

/**
 * La subida de una sola foto (una línea, un socio, la portada del sitio): lo mismo que
 * `useImageUploads` con `max: 1`, pero una foto nueva reemplaza a la anterior.
 *
 * @param options - Ver {@link UseSingleImageUploadOptions}.
 * @returns La subida (ver {@link SingleImageUpload}).
 * @throws {RangeError} Si `purpose` no es un uso de foto.
 * @throws {Error} Si no hay un `ImageUploaderProvider` más arriba.
 */
export function useSingleImageUpload({ purpose }: UseSingleImageUploadOptions): SingleImageUpload {
  const uploads = useImageUploads({ purpose, max: 1, replace: true })
  const item = uploads.items[0] ?? null
  const id = item?.id ?? null
  return {
    item,
    add: uploads.add,
    cancel: () => {
      if (id !== null) uploads.remove(id)
    },
    retry: () => {
      if (id !== null) uploads.retry(id)
    },
    remove: () => {
      if (id !== null) uploads.remove(id)
    },
    isUploading: uploads.isUploading,
    hasErrors: uploads.hasErrors,
    error: uploads.error,
  }
}
