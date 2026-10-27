import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { MediaPurpose } from '@galpon/api-client'
import { isApiError } from '@galpon/api-client'
import { MEDIA_PURPOSES } from '@galpon/domain'
import type { UploadItem, UploadStatus } from './media.types'
import { isAbortError } from './abort'
import { useImageUploaderContext } from './image-uploader-context'
import { MEDIA_COPY } from './media.copy'
import { MediaUploadError } from './media.types'
import { checkFile } from './validate-image-file'

/** Opciones de {@link useImageUploads}. */
export interface UseImageUploadsOptions {
  /** Para qué son las fotos: define la carpeta y la firma. */
  purpose: MediaPurpose
  /** Cupo total de fotos (las que ya hay más las de la cola), un entero desde 1. */
  max: number
  /** Fotos que ya están guardadas y cuentan para el cupo; por omisión 0. */
  current?: number
  /**
   * Si es `true`, cada foto nueva reemplaza a las de la cola en lugar de sumarse (lo usa
   * `useSingleImageUpload`); las que no entran en el cupo se ignoran sin aviso.
   */
  replace?: boolean
}

/** La cola de subidas que devuelve {@link useImageUploads}. */
export interface ImageUploads {
  /** Las fotos de la cola, en el orden en que se agregaron. */
  items: UploadItem[]
  /**
   * Valida los archivos (formato, peso, medidas y cupo) y arranca la subida de los que se pueden
   * subir, cada uno con su vista previa `blob:`. Se cumple cuando ya están en la cola.
   */
  add: (files: Iterable<File> | ArrayLike<File>) => Promise<void>
  /** Cancela la subida en curso de una foto y la quita de la cola (revoca su `blob:`). */
  cancel: (id: string) => void
  /** Vuelve a subir una foto con error (pide una firma nueva). */
  retry: (id: string) => void
  /** Quita una foto de la cola (corta su subida si sigue y revoca su `blob:`). */
  remove: (id: string) => void
  /** `true` mientras alguna foto se está subiendo. */
  isUploading: boolean
  /** `true` si alguna foto quedó con error. */
  hasErrors: boolean
  /** Por qué no se agregaron archivos en el último `add`, o `null` si entraron todos. */
  error: string | null
}

/** Lo que la cola guarda de cada foto fuera del estado de React. */
interface Entry {
  /** El archivo elegido (el reintento sube el mismo). */
  file: File
  /** La URL `blob:` de la vista previa. */
  previewUrl: string
  /** Estado de la subida, el mismo que el del ítem. */
  status: UploadStatus
  /** Corta el intento en curso, o `null` si no hay ninguno. */
  controller: AbortController | null
}

/**
 * Valida las opciones de la cola.
 *
 * @throws {RangeError} Si `purpose` no es un uso de foto, `max` no es un entero desde 1 o
 *   `current` no es un entero de 0 a `max`.
 */
function checkOptions(purpose: MediaPurpose, max: number, current: number): void {
  if (!(MEDIA_PURPOSES as readonly string[]).includes(purpose)) {
    throw new RangeError(
      `El uso de la foto tiene que ser ${MEDIA_PURPOSES.join(', ')}; se recibió "${purpose}".`,
    )
  }
  if (!Number.isInteger(max) || max < 1) {
    throw new RangeError(
      `El cupo de fotos tiene que ser un entero desde 1; se recibió ${String(max)}.`,
    )
  }
  if (!Number.isInteger(current) || current < 0 || current > max) {
    throw new RangeError(
      `Las fotos que ya hay tienen que ser un entero de 0 a ${String(max)}; se recibió ${String(current)}.`,
    )
  }
}

/**
 * Mensaje para mostrar de una subida que falló.
 *
 * @param reason - Lo que rechazó la subida.
 * @returns El mensaje del error de subida o de la API; si no, "No pudimos leer la foto." (falló
 *   el procesado local de la foto).
 */
function messageOf(reason: unknown): string {
  if (reason instanceof MediaUploadError || isApiError(reason)) return reason.message
  return MEDIA_COPY.unreadable
}

/**
 * Cola de subidas de fotos con el uploader de `ImageUploaderProvider`. `add` valida formato, peso,
 * medidas y cupo ("Ya hay {max} fotos: quitá una para agregar otra.") y arranca cada subida con su
 * vista previa `blob:`; `cancel`, `retry` y `remove` actúan sobre una foto. Cada `blob:` se revoca
 * al quitar la foto o al desmontar (que además corta las subidas en curso).
 *
 * Un `401` deja la foto en error con "Tu sesión venció: ingresá de nuevo y reintentá." y avisa a
 * la estructura (`onUnauthorized` del proveedor), que abre el diálogo de re-ingreso.
 *
 * @param options - Ver {@link UseImageUploadsOptions}.
 * @returns La cola (ver {@link ImageUploads}).
 * @throws {RangeError} Si las opciones no son válidas.
 * @throws {Error} Si no hay un `ImageUploaderProvider` más arriba.
 */
export function useImageUploads({
  purpose,
  max,
  current = 0,
  replace = false,
}: UseImageUploadsOptions): ImageUploads {
  checkOptions(purpose, max, current)
  const { uploader, onUnauthorized } = useImageUploaderContext()
  const idPrefix = useId()
  const [items, setItems] = useState<UploadItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const entriesRef = useRef(new Map<string, Entry>())
  const nextIdRef = useRef(0)
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    const entries = entriesRef.current
    return () => {
      mountedRef.current = false
      for (const entry of entries.values()) {
        entry.controller?.abort()
        URL.revokeObjectURL(entry.previewUrl)
      }
      entries.clear()
    }
  }, [])

  const patch = useCallback((id: string, changes: Partial<UploadItem>) => {
    const entry = entriesRef.current.get(id)
    if (entry !== undefined && changes.status !== undefined) entry.status = changes.status
    setItems((list) => list.map((item) => (item.id === id ? { ...item, ...changes } : item)))
  }, [])

  const start = useCallback(
    (id: string) => {
      const entry = entriesRef.current.get(id)
      if (entry === undefined) return
      const controller = new AbortController()
      entry.controller = controller
      // Solo cuenta el intento vigente: uno cancelado, quitado o reemplazado se ignora.
      const isCurrent = () => entriesRef.current.get(id)?.controller === controller
      void uploader
        .upload(entry.file, {
          purpose,
          signal: controller.signal,
          onProgress: (progress) => {
            if (isCurrent()) patch(id, { progress })
          },
        })
        .then(
          (result) => {
            if (!isCurrent()) return
            entry.controller = null
            patch(id, { status: 'done', progress: 100, result })
          },
          (reason: unknown) => {
            if (!isCurrent() || isAbortError(reason)) return
            entry.controller = null
            patch(id, { status: 'error', errorMessage: messageOf(reason) })
            if (reason instanceof MediaUploadError && reason.reason === 'unauthorized') {
              onUnauthorized?.()
            }
          },
        )
    },
    [uploader, purpose, patch, onUnauthorized],
  )

  const remove = useCallback((id: string) => {
    const entry = entriesRef.current.get(id)
    if (entry === undefined) return
    entriesRef.current.delete(id)
    entry.controller?.abort()
    URL.revokeObjectURL(entry.previewUrl)
    setItems((list) => list.filter((item) => item.id !== id))
  }, [])

  const cancel = useCallback(
    (id: string) => {
      if (entriesRef.current.get(id)?.status === 'uploading') remove(id)
    },
    [remove],
  )

  const retry = useCallback(
    (id: string) => {
      if (entriesRef.current.get(id)?.status !== 'error') return
      patch(id, { status: 'uploading', progress: 0, errorMessage: null, result: null })
      start(id)
    },
    [patch, start],
  )

  const add = useCallback(
    async (files: Iterable<File> | ArrayLike<File>) => {
      const list = Array.from(files)
      const problems = await Promise.all(list.map((file) => checkFile(file)))
      if (!mountedRef.current) return

      const entries = entriesRef.current
      const free = max - current - (replace ? 0 : entries.size)
      const messages: string[] = []
      const accepted: File[] = []
      let overQuota = false
      for (const [index, file] of list.entries()) {
        const problem = problems[index] ?? null
        if (problem !== null) messages.push(MEDIA_COPY.rejectedFile(file.name, problem))
        else if (accepted.length < free) accepted.push(file)
        else overQuota = true
      }
      if (overQuota && !replace) messages.push(MEDIA_COPY.quota(max))
      setError(messages.length === 0 ? null : messages.join(' '))
      if (accepted.length === 0) return

      if (replace) for (const id of [...entries.keys()]) remove(id)
      const added = accepted.map((file): UploadItem => {
        nextIdRef.current += 1
        const id = `${idPrefix}${String(nextIdRef.current)}`
        const previewUrl = URL.createObjectURL(file)
        entries.set(id, { file, previewUrl, status: 'uploading', controller: null })
        return {
          id,
          fileName: file.name,
          previewUrl,
          status: 'uploading',
          progress: 0,
          errorMessage: null,
          result: null,
        }
      })
      setItems((previous) => [...previous, ...added])
      for (const item of added) start(item.id)
    },
    [max, current, replace, idPrefix, remove, start],
  )

  return {
    items,
    add,
    cancel,
    retry,
    remove,
    isUploading: items.some((item) => item.status === 'uploading'),
    hasErrors: items.some((item) => item.status === 'error'),
    error,
  }
}
