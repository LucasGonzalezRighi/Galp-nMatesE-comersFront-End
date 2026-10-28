import type { QueryKey } from '@tanstack/react-query'
import type { FieldPath, FieldValues, UseFormGetValues, UseFormSetError } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isApiError } from '@galpon/api-client'
import { toast } from '../../components/ui/toast'
import { CONTENT_COPY } from './content.copy'

/** Opciones de {@link useSaveContent}. */
export interface UseSaveContentOptions<TValues extends FieldValues, TBody, TSaved> {
  /** Clave de la consulta de la página, que recibe lo guardado. */
  queryKey: QueryKey
  /** Hace el `PUT` con el contenido completo y devuelve lo guardado. */
  save: (body: TBody) => Promise<TSaved>
  /** `setError` del formulario, para poner cada error del `422` en su campo. */
  setError: UseFormSetError<TValues>
  /**
   * `getValues` del formulario: una ruta del `422` que no está entre sus valores no tiene campo
   * donde verse, así que su mensaje no se pierde (va a un toast).
   */
  getValues: UseFormGetValues<TValues>
  /** Se llama con lo guardado (por ejemplo, para `reset` con los valores nuevos). */
  onSaved: (saved: TSaved) => void
}

/**
 * Guarda una página de contenido entera. Con éxito deja lo guardado en la caché de la consulta,
 * llama a `onSaved` y avisa "Contenido guardado.". Un `422` va a cada campo (rutas con punto e
 * índice, como `scenes.2.text`; el foco va al primero) y, si alguna ruta no es un valor del
 * formulario, además a un toast con el mensaje general; otro error, a un toast con su mensaje.
 * El `401` y el `403` los maneja la estructura del admin.
 *
 * @param options - Ver {@link UseSaveContentOptions}.
 * @returns La mutación de React Query.
 */
export function useSaveContent<TValues extends FieldValues, TBody, TSaved>({
  queryKey,
  save,
  setError,
  getValues,
  onSaved,
}: UseSaveContentOptions<TValues, TBody, TSaved>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: save,
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKey, saved)
      onSaved(saved)
      toast.success(CONTENT_COPY.saved)
    },
    onError: (error) => {
      if (!isApiError(error)) {
        toast.error(CONTENT_COPY.saveError)
        return
      }
      // "Tu sesión venció" (401) y el token CSRF rotado (403) los resuelve la estructura.
      if (error.kind === 'unauthorized' || error.kind === 'forbidden') return
      const fields = Object.entries(error.fieldErrors)
      if (error.kind !== 'validation' || fields.length === 0) {
        toast.error(error.message)
        return
      }
      // Las rutas del `422` son las del contrato, que el formulario copia: una que no está entre
      // sus valores no tiene campo donde verse.
      const known = fields.filter(([path]) => {
        const value: unknown = getValues(path as FieldPath<TValues>)
        return value !== undefined
      })
      known.forEach(([path, message], index) => {
        setError(
          path as FieldPath<TValues>,
          { type: 'server', message },
          { shouldFocus: index === 0 },
        )
      })
      if (known.length < fields.length) toast.error(error.message)
    },
  })
}
