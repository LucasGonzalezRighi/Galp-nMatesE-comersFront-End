import { vi } from 'vitest'

/** Manejador de evento de un `XMLHttpRequest`. */
type XhrHandler = ((event: ProgressEvent) => void) | null

/**
 * `XMLHttpRequest` falso para probar la subida a Cloudinary sin red (la única excepción a "sin
 * mocks de fetch"). Guarda cada instancia y deja disparar sus eventos a mano.
 */
export class FakeXhr {
  /** Cada XHR creado desde que se instaló, en orden. */
  static instances: FakeXhr[] = []

  method = ''
  url = ''
  timeout = 0
  status = 0
  responseText = ''
  /** Lo que se mandó con `send`. */
  body: unknown = null
  /** `true` después de `abort()`. */
  aborted = false
  readonly upload: { onprogress: XhrHandler } = { onprogress: null }
  onload: XhrHandler = null
  onerror: XhrHandler = null
  ontimeout: XhrHandler = null
  onabort: XhrHandler = null

  constructor() {
    FakeXhr.instances.push(this)
  }

  open(method: string, url: string): void {
    this.method = method
    this.url = url
  }

  send(body: unknown): void {
    this.body = body
  }

  abort(): void {
    this.aborted = true
    this.onabort?.(new ProgressEvent('abort'))
  }

  /** Avisa que se mandaron `loaded` de `total` bytes. */
  progress(loaded: number, total: number): void {
    this.upload.onprogress?.(
      new ProgressEvent('progress', { lengthComputable: true, loaded, total }),
    )
  }

  /** Responde con `status` y `body` (como JSON, salvo que sea un texto). */
  respond(status: number, body: unknown): void {
    this.status = status
    this.responseText = typeof body === 'string' ? body : JSON.stringify(body)
    this.onload?.(new ProgressEvent('load'))
  }

  /** Simula un corte de red. */
  failNetwork(): void {
    this.onerror?.(new ProgressEvent('error'))
  }

  /** Simula que pasó el `timeout`. */
  expire(): void {
    this.ontimeout?.(new ProgressEvent('timeout'))
  }

  /** El `FormData` que se mandó (falla si se mandó otra cosa). */
  get form(): FormData {
    if (!(this.body instanceof FormData)) throw new Error('El XHR no mandó un FormData.')
    return this.body
  }
}

/** Reemplaza `XMLHttpRequest` por {@link FakeXhr} hasta `vi.unstubAllGlobals()`. */
export function installFakeXhr(): void {
  FakeXhr.instances = []
  vi.stubGlobal('XMLHttpRequest', FakeXhr)
}

/**
 * Espera a que se abra el XHR número `index` (la firma se pide antes, de forma asíncrona).
 *
 * @param index - Posición del XHR, desde 0.
 * @returns El XHR falso.
 */
export function nextXhr(index = 0): Promise<FakeXhr> {
  return vi.waitFor(() => {
    const xhr = FakeXhr.instances[index]
    if (xhr === undefined) throw new Error(`Todavía no se abrió el XHR ${String(index)}.`)
    return xhr
  })
}
