import type { ChangeEvent, DragEvent, ReactNode } from 'react'
import { ImageIcon } from '@phosphor-icons/react'
import { useId, useRef, useState } from 'react'
import { Button } from './Button'
import { cx } from './cx'
import { IMAGE_ACCEPT } from './image-accept'
import { OVERLAY_COPY } from './overlay.copy'

/** Props de {@link ImageDropzone}. */
export interface ImageDropzoneProps {
  /** Con `true` acepta varias fotos (textos en plural); con `false`, una sola. */
  multiple: boolean
  /** Deshabilita el botón y deja de aceptar archivos soltados. */
  disabled?: boolean
  /** Ayuda debajo (formatos, peso, medidas, cupo). */
  hint?: string
  /** Error de la última elección (por ejemplo "Ya hay 8 fotos…"), con `role="alert"`. */
  error?: string
  /** Se llama con los archivos elegidos o soltados (con `multiple={false}`, solo el primero). */
  onFiles: (files: File[]) => void
}

/**
 * Indica si un arrastre trae archivos (y no, por ejemplo, texto seleccionado).
 *
 * @param event - Evento de arrastre.
 * @returns `true` si entre los tipos arrastrados hay archivos.
 */
function hasFiles(event: DragEvent<HTMLElement>): boolean {
  return Array.from(event.dataTransfer.types).includes('Files')
}

/**
 * Zona para elegir o soltar fotos: borde punteado `divider` (que pasa a `accent` al arrastrar
 * encima), el texto "Arrastrá fotos acá o elegí archivos" y un botón real "Elegir archivos" que
 * abre el selector (JPG, PNG o WebP). El `input type="file"` queda oculto para el lector
 * (`aria-hidden`, fuera del orden de tabulación): el único control con nombre es el botón. Solo
 * es presentación: validar y subir es de `components/media`.
 *
 * @param props - Ver {@link ImageDropzoneProps}.
 * @example
 * <ImageDropzone multiple hint={MEDIA_COPY.hint} error={uploads.error} onFiles={uploads.add} />
 */
export function ImageDropzone({
  multiple,
  disabled = false,
  hint,
  error,
  onFiles,
}: ImageDropzoneProps): ReactNode {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const chooseLabel = multiple ? OVERLAY_COPY.chooseFiles : OVERLAY_COPY.chooseFile
  const describedBy =
    [hint === undefined ? null : hintId, error === undefined ? null : errorId]
      .filter((value) => value !== null)
      .join(' ') || undefined

  const deliver = (list: FileList | readonly File[]) => {
    const files = Array.from(list)
    if (files.length === 0) return
    onFiles(multiple ? files : files.slice(0, 1))
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (disabled || !hasFiles(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsDragging(true)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    if (disabled) return
    deliver(event.dataTransfer.files)
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target
    if (files !== null) deliver(files)
    event.target.value = ''
  }

  return (
    <div className="flex flex-col gap-1">
      <div
        onDragEnter={handleDragOver}
        onDragOver={handleDragOver}
        onDragLeave={() => {
          setIsDragging(false)
        }}
        onDrop={handleDrop}
        className={cx(
          'flex flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed px-4 py-6 text-center transition-colors motion-reduce:transition-none',
          isDragging ? 'border-accent bg-accent/10' : 'border-divider',
          disabled && 'opacity-45',
        )}
      >
        <ImageIcon size={18} weight="regular" aria-hidden="true" className="text-neutral-400" />
        <p className="text-sm">
          {multiple ? OVERLAY_COPY.dropzoneMultiple : OVERLAY_COPY.dropzoneSingle}
        </p>
        <Button
          variant="secondary"
          disabled={disabled}
          aria-describedby={describedBy}
          onClick={() => {
            inputRef.current?.click()
          }}
        >
          {chooseLabel}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple={multiple}
          disabled={disabled}
          aria-hidden="true"
          tabIndex={-1}
          onChange={handleChange}
          className="sr-only"
        />
      </div>
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
