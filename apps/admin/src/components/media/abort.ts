/** Mensaje del error que rechaza una subida cancelada. */
const ABORT_MESSAGE = 'Se canceló la subida.'

/**
 * Crea el error con el que se rechaza una subida cancelada: un `DOMException` `AbortError`, como
 * el de `fetch`.
 *
 * @returns El error de cancelación.
 */
export function createAbortError(): DOMException {
  return new DOMException(ABORT_MESSAGE, 'AbortError')
}

/**
 * Indica si un error es el de una subida cancelada.
 *
 * @param error - Lo que atrapó un `catch`.
 * @returns `true` si es un `AbortError`.
 */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/**
 * Lanza el error de cancelación si la señal ya se activó.
 *
 * @param signal - Señal de la subida, si la hay.
 * @throws {DOMException} `AbortError` si `signal` está activada.
 */
export function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) throw createAbortError()
}

/**
 * Espera `ms` milisegundos, o hasta que se cancele la subida.
 *
 * @param ms - Milisegundos a esperar, desde 0.
 * @param signal - Señal que corta la espera.
 * @returns Una promesa que se cumple al pasar el tiempo.
 * @throws {RangeError} Si `ms` no es un número finito desde 0.
 * @throws {DOMException} `AbortError` (como rechazo) si se cancela antes.
 */
export function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (!Number.isFinite(ms) || ms < 0) {
    throw new RangeError(
      `La espera tiene que ser un número de milisegundos desde 0; se recibió ${String(ms)}.`,
    )
  }
  return new Promise((resolve, reject) => {
    if (signal?.aborted === true) {
      reject(createAbortError())
      return
    }
    const onAbort = () => {
      clearTimeout(timer)
      reject(createAbortError())
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
