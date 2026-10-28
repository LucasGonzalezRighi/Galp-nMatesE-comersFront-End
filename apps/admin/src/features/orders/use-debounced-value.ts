import { useEffect, useState } from 'react'

/**
 * Devuelve `value` recién cuando deja de cambiar durante `delayMs`. El primer valor llega sin
 * espera (al volver a la pantalla, la búsqueda guardada se aplica enseguida).
 *
 * @param value - Valor que cambia, por ejemplo el texto de una búsqueda.
 * @param delayMs - Espera en milisegundos, un entero mayor o igual a 0.
 * @returns El último valor estable.
 * @throws {RangeError} Si la espera no es un entero mayor o igual a 0.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  if (!Number.isInteger(delayMs) || delayMs < 0) {
    throw new RangeError(
      `La espera tiene que ser un entero mayor o igual a 0; se recibió ${String(delayMs)}.`,
    )
  }
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value)
    }, delayMs)
    return () => {
      clearTimeout(timer)
    }
  }, [value, delayMs])
  return debounced
}
