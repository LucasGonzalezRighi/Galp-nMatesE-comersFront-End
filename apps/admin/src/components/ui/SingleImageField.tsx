import type { ChangeEvent, ReactNode } from 'react'
import { useId, useRef } from 'react'
import type { ImageTileStatus } from './ImageTile'
import { Button } from './Button'
import { IMAGE_ACCEPT } from './image-accept'
import { ImageDropzone } from './ImageDropzone'
import { ImageTile } from './ImageTile'
import { OVERLAY_COPY } from './overlay.copy'

/** La foto guardada del campo. */
export interface SingleImageValue {
  /** Dirección de la foto. */
  src: string
  /** Su texto alternativo. */
  alt: string
}

/**
 * Estado de la subida que muestra el campo: en curso, con error o recién terminada (sale de
 * `UploadItem` de `components/media`). No confundir con `SingleImageUpload`, lo que devuelve
 * `useSingleImageUpload`.
 */
export interface SingleImageUploadState {
  /** Vista previa local (`blob:`). */
  previewUrl: string
  /** Estado de la subida. */
  status: ImageTileStatus
  /** Progreso, de 0 a 100. */
  progress: number
  /** Motivo del error, o `null`. */
  errorMessage: string | null
}

/** Props de {@link SingleImageField}. */
export interface SingleImageFieldProps {
  /** Nombre del campo (la leyenda del grupo), por ejemplo "Foto". */
  label: string
  /** Ayuda de la zona para elegir (formatos, peso, medidas). */
  hint?: string
  /** La foto guardada, o `null`. */
  image: SingleImageValue | null
  /** La subida actual, o `null`. Mientras está en curso o con error, tapa a `image`. */
  upload: SingleImageUploadState | null
  /**
   * Por qué no se tomó el último archivo (formato, peso, medidas), por ejemplo el `error` de
   * `useSingleImageUpload`. Se muestra con `role="alert"` tanto sin foto como con foto.
   */
  error?: string
  /** Se llama con el archivo elegido o soltado (uno solo). */
  onFiles: (files: File[]) => void
  /** "Cancelar" la subida en curso, o "Quitar" la que falló (vuelve la foto anterior). */
  onCancel: () => void
  /** "Reintentar" una subida que falló. */
  onRetry: () => void
  /** "Quitar foto": deja el campo sin foto. */
  onRemove: () => void
  /** Campo del texto alternativo, debajo de la miniatura. */
  altField: ReactNode
}

/**
 * Campo de una sola foto (línea, socio): sin foto muestra `ImageDropzone`; con foto, la
 * miniatura (`ImageTile`) con su texto alternativo y "Cambiar foto", que se deshabilita mientras
 * hay una subida en curso. Como en `ImageDropzone`, el `input type="file"` queda oculto para el
 * lector y el único control con nombre es el botón. Solo es presentación: la subida es de
 * `components/media`.
 *
 * @param props - Ver {@link SingleImageFieldProps}.
 * @example
 * <SingleImageField label="Foto" hint={MEDIA_COPY.hint} image={photo} upload={upload.item}
 *   error={upload.error ?? undefined} onFiles={upload.add} onCancel={upload.cancel}
 *   onRetry={upload.retry} onRemove={clearPhoto} altField={<TextInput … />} />
 */
export function SingleImageField({
  label,
  hint,
  image,
  upload,
  error,
  onFiles,
  onCancel,
  onRetry,
  onRemove,
  altField,
}: SingleImageFieldProps): ReactNode {
  const inputRef = useRef<HTMLInputElement>(null)
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy =
    [hint === undefined ? null : hintId, error === undefined ? null : errorId]
      .filter((value) => value !== null)
      .join(' ') || undefined
  const pending = upload !== null && upload.status !== 'done' ? upload : null
  const isUploading = pending?.status === 'uploading'

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file !== undefined) onFiles([file])
    event.target.value = ''
  }

  let content: ReactNode
  if (upload === null && image === null) {
    content = <ImageDropzone multiple={false} hint={hint} error={error} onFiles={onFiles} />
  } else {
    content = (
      <div className="flex max-w-60 flex-col gap-2">
        <ImageTile
          src={upload?.previewUrl ?? image?.src ?? ''}
          alt={pending === null ? (image?.alt ?? '') : ''}
          status={upload?.status ?? 'done'}
          progress={upload?.progress}
          errorMessage={upload?.errorMessage ?? undefined}
          onCancel={onCancel}
          onRetry={onRetry}
          onRemove={pending === null ? onRemove : onCancel}
        >
          {altField}
        </ImageTile>
        <Button
          variant="secondary"
          disabled={isUploading}
          aria-describedby={describedBy}
          onClick={() => {
            inputRef.current?.click()
          }}
        >
          {OVERLAY_COPY.changePhoto}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          disabled={isUploading}
          aria-hidden="true"
          tabIndex={-1}
          onChange={handleChange}
          className="sr-only"
        />
        {hint !== undefined && (
          <p id={hintId} className="text-xs text-neutral-400">
            {hint}
          </p>
        )}
        {error !== undefined && (
          <p id={errorId} role="alert" className="text-danger text-xs">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
      <legend className="text-foreground/70 mb-2 p-0 text-xs">{label}</legend>
      {content}
    </fieldset>
  )
}
