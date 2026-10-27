import type { ReactNode } from 'react'
import { XIcon } from '@phosphor-icons/react'
import { useId } from 'react'
import { Button } from './Button'
import { buttonClass } from './button-class'
import { cx } from './cx'
import { OVERLAY_COPY, uploadingProgress } from './overlay.copy'

/** Estado de una foto: subiendo, con error o lista. */
export type ImageTileStatus = 'uploading' | 'error' | 'done'

/** Props de {@link ImageTile}. */
export interface ImageTileProps {
  /** Dirección de la foto o de su vista previa (`blob:` mientras sube). */
  src: string
  /** Texto alternativo; vacío mientras es solo una vista previa. */
  alt: string
  /** Estado de la foto. */
  status: ImageTileStatus
  /** Progreso de la subida, de 0 a 100 (se redondea). Por omisión 0. */
  progress?: number
  /** Motivo del error; sin él se muestra un texto genérico. */
  errorMessage?: string
  /** Muestra la insignia "Principal" (la primera foto de un producto). */
  isMain?: boolean
  /** "Cancelar" mientras sube. */
  onCancel?: () => void
  /** "Reintentar" después de un error. */
  onRetry?: () => void
  /** "Quitar foto" (lista) o "Quitar" (con error). */
  onRemove: () => void
  /** Debajo de la miniatura: el campo del texto alternativo. */
  children?: ReactNode
}

/**
 * Normaliza el progreso de una subida.
 *
 * @param progress - Porcentaje recibido.
 * @returns El porcentaje redondeado.
 * @throws {RangeError} Si no es un número entre 0 y 100.
 */
function normalizeProgress(progress: number): number {
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
    throw new RangeError(
      `El progreso de la subida tiene que estar entre 0 y 100; se recibió ${String(progress)}.`,
    )
  }
  return Math.round(progress)
}

/**
 * Miniatura de una foto en proporción 4:5 con `object-cover`. Subiendo: barra de progreso
 * ("Subiendo… 40 %") y "Cancelar"; con error: el motivo, "Reintentar" y "Quitar"; lista: la
 * insignia "Principal" (si corresponde) y el botón "Quitar foto". Debajo va `children` (el
 * texto alternativo). Solo es presentación: la subida es de `components/media`.
 *
 * @param props - Ver {@link ImageTileProps}.
 * @throws {RangeError} Si `progress` no está entre 0 y 100.
 * @example
 * <ImageTile src={item.previewUrl} alt="" status={item.status} progress={item.progress}
 *   onCancel={() => uploads.cancel(item.id)} onRemove={() => uploads.remove(item.id)} />
 */
export function ImageTile({
  src,
  alt,
  status,
  progress = 0,
  errorMessage,
  isMain = false,
  onCancel,
  onRetry,
  onRemove,
  children,
}: ImageTileProps): ReactNode {
  const percent = normalizeProgress(progress)
  const progressId = useId()
  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-neutral-900">
        <img
          src={src}
          alt={alt}
          className={cx('size-full object-cover', status !== 'done' && 'opacity-60')}
        />
        {status === 'done' && isMain && (
          <span className="rounded-tag bg-background/80 absolute top-2 left-2 px-1.5 py-0.5 text-[11px] font-medium">
            {OVERLAY_COPY.mainPhoto}
          </span>
        )}
        {status === 'done' && (
          <span className="bg-background/80 absolute top-1 right-1 rounded-md">
            <button
              type="button"
              aria-label={OVERLAY_COPY.removePhoto}
              onClick={onRemove}
              className={buttonClass('icon', 'md')}
            >
              <XIcon size={18} weight="regular" aria-hidden="true" />
            </button>
          </span>
        )}
      </div>
      {status === 'uploading' && (
        <div className="flex flex-col gap-1">
          <div
            role="progressbar"
            aria-labelledby={progressId}
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="bg-foreground/10 h-1 overflow-hidden rounded-sm"
          >
            <div
              className="bg-accent h-full transition-[width] duration-150 motion-reduce:transition-none"
              style={{ width: `${String(percent)}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span id={progressId} className="text-xs text-neutral-400 tabular-nums">
              {uploadingProgress(percent)}
            </span>
            {onCancel !== undefined && (
              <Button variant="ghost" onClick={onCancel}>
                {OVERLAY_COPY.cancelUpload}
              </Button>
            )}
          </div>
        </div>
      )}
      {status === 'error' && (
        <div className="flex flex-col gap-2">
          <p role="alert" className="text-danger text-xs">
            {errorMessage ?? OVERLAY_COPY.uploadFailed}
          </p>
          <div className="flex flex-wrap gap-2">
            {onRetry !== undefined && (
              <Button variant="secondary" onClick={onRetry}>
                {OVERLAY_COPY.retry}
              </Button>
            )}
            <Button variant="ghost" onClick={onRemove}>
              {OVERLAY_COPY.remove}
            </Button>
          </div>
        </div>
      )}
      {children}
    </div>
  )
}
