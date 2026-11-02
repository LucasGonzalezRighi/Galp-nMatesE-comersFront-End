/**
 * Lugar de una lista como texto, para armar la ruta de un campo del formulario
 * (`` `scenes.${fieldIndex(2)}.text` ``) con el tipo `${number}` que esperan las rutas de React
 * Hook Form.
 *
 * @param index - Lugar, desde 0.
 * @returns El lugar como texto, por ejemplo "2".
 * @throws {RangeError} Si no es un entero mayor o igual a 0.
 */
export function fieldIndex(index: number): `${number}` {
  if (!Number.isSafeInteger(index) || index < 0) {
    throw new RangeError(
      `El lugar en la lista tiene que ser un entero mayor o igual a 0; se recibió ${String(index)}.`,
    )
  }
  return String(index) as `${number}`
}

/** Un movimiento de un elemento dentro de una lista. */
export interface ListMove {
  /** Lugar de donde sale, desde 0. */
  from: number
  /** Lugar adonde llega, desde 0. */
  to: number
}

/**
 * Encuentra el único movimiento que lleva de un orden a otro, para pasarlo a `move()` de
 * `useFieldArray` cuando `SortableList` avisa el orden nuevo.
 *
 * @param before - Claves en el orden actual.
 * @param after - Las mismas claves en el orden nuevo.
 * @returns El movimiento, o `null` si el orden no cambió.
 * @throws {RangeError} Si las listas no tienen las mismas claves o el cambio no es un solo
 *   movimiento.
 * @example
 * findMove(['a', 'b', 'c'], ['c', 'a', 'b']) // { from: 2, to: 0 }
 */
export function findMove(before: readonly string[], after: readonly string[]): ListMove | null {
  if (
    before.length !== after.length ||
    [...before].sort().join('\u0000') !== [...after].sort().join('\u0000')
  ) {
    throw new RangeError('El orden nuevo tiene que tener las mismas claves que el actual.')
  }
  if (before.every((key, index) => after[index] === key)) return null
  for (const key of before) {
    const rest = (list: readonly string[]) => list.filter((candidate) => candidate !== key)
    if (rest(before).every((candidate, index) => rest(after)[index] === candidate)) {
      return { from: before.indexOf(key), to: after.indexOf(key) }
    }
  }
  throw new RangeError('El orden nuevo tiene que diferir del actual en un solo movimiento.')
}

/**
 * Lugares de los valores que ya aparecieron antes en la lista (el segundo y los siguientes de
 * cada repetido). Compara sin espacios en los extremos, como los guardan los schemas.
 *
 * @param values - Valores en orden.
 * @returns Lugares desde 0; vacío si no hay repetidos. Los valores vacíos no cuentan.
 * @example
 * repeatedIndexes(['envios', 'pagos', 'envios']) // [2]
 */
export function repeatedIndexes(values: readonly string[]): number[] {
  const seen = new Set<string>()
  const repeated: number[] = []
  values.forEach((value, index) => {
    const key = value.trim()
    if (key === '') return
    if (seen.has(key)) repeated.push(index)
    else seen.add(key)
  })
  return repeated
}

/**
 * Lee los mensajes de error de un campo que es una lista (por ejemplo las líneas de un título):
 * el de la lista entera (cantidad de elementos) y el de cada elemento. React Hook Form los deja
 * como un arreglo de errores, con el de la lista en `message` o en `root`.
 *
 * @param error - Lo que hay en `formState.errors` en la ruta de la lista.
 * @param count - Cantidad de elementos.
 * @returns `list` y un mensaje (o `undefined`) por elemento.
 * @throws {RangeError} Si `count` no es un entero mayor o igual a 0.
 */
export function listFieldErrors(
  error: unknown,
  count: number,
): { list: string | undefined; items: (string | undefined)[] } {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError(
      `La cantidad de elementos tiene que ser un entero mayor o igual a 0; se recibió ${String(count)}.`,
    )
  }
  const items = Array.from({ length: count }, (_, index) =>
    messageOf(Array.isArray(error) ? (error as unknown[])[index] : undefined),
  )
  const list =
    messageOf(error) ?? (isRecord(error) ? messageOf(Reflect.get(error, 'root')) : undefined)
  return { list, items }
}

/** Indica si un valor es un objeto (no `null`). */
function isRecord(value: unknown): value is object {
  return typeof value === 'object' && value !== null
}

/** El `message` de un error de React Hook Form, si lo tiene. */
function messageOf(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined
  const message: unknown = Reflect.get(value, 'message')
  return typeof message === 'string' && message !== '' ? message : undefined
}
