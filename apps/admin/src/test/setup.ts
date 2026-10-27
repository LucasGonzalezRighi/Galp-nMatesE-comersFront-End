import '@testing-library/jest-dom/vitest'

/** Cuenta las URL `blob:` falsas para que cada una sea distinta. */
let blobCounter = 0

/**
 * Define una propiedad solo si el objeto todavía no tiene un valor para ella, para no pisar lo que
 * jsdom o un test ya hayan puesto.
 *
 * @param target - Objeto que recibe la propiedad (una clase, un prototipo o `globalThis`).
 * @param name - Nombre de la propiedad.
 * @param value - Valor que se instala si falta.
 */
function defineIfMissing(target: object, name: string, value: unknown): void {
  // `in` no alcanza: Vitest declara algunas claves de jsdom (como `matchMedia`) con valor `undefined`.
  if (Reflect.get(target, name) !== undefined) return
  Object.defineProperty(target, name, { configurable: true, writable: true, value })
}

/** Instala los polyfills de las APIs del navegador que jsdom no trae y que usan las pantallas. */
function installPolyfills(): void {
  // ResizeObserver: lo usan Radix (popovers, menús), TanStack Table y motion. jsdom no mide, así
  // que nunca avisa de cambios de tamaño.
  class FakeResizeObserver {
    observe(): void {
      // Sin efecto: jsdom no calcula tamaños.
    }

    unobserve(): void {
      // Sin efecto: jsdom no calcula tamaños.
    }

    disconnect(): void {
      // Sin efecto: jsdom no calcula tamaños.
    }
  }
  defineIfMissing(globalThis, 'ResizeObserver', FakeResizeObserver)

  // matchMedia: lo consultan motion y los estilos `prefers-reduced-motion`. Ninguna consulta
  // coincide (pantalla de escritorio, con movimiento).
  defineIfMissing(globalThis, 'matchMedia', (query: string): MediaQueryList => {
    return {
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }
  })

  // PointerEvent: Radix y user-event leen `button`, `ctrlKey` y `pointerId` de los eventos del
  // puntero. Se parte de MouseEvent para conservar los botones y las teclas modificadoras.
  class FakePointerEvent extends MouseEvent {
    readonly pointerId: number
    readonly width: number
    readonly height: number
    readonly pressure: number
    readonly tangentialPressure: number
    readonly tiltX: number
    readonly tiltY: number
    readonly twist: number
    readonly pointerType: string
    readonly isPrimary: boolean

    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 0
      this.width = init.width ?? 1
      this.height = init.height ?? 1
      this.pressure = init.pressure ?? 0
      this.tangentialPressure = init.tangentialPressure ?? 0
      this.tiltX = init.tiltX ?? 0
      this.tiltY = init.tiltY ?? 0
      this.twist = init.twist ?? 0
      this.pointerType = init.pointerType ?? ''
      this.isPrimary = init.isPrimary ?? false
    }
  }
  defineIfMissing(globalThis, 'PointerEvent', FakePointerEvent)

  // Captura del puntero: Radix (Select, Slider) y el arrastre de motion la piden. Se guarda qué
  // punteros capturó cada elemento.
  const captures = new WeakMap<Element, Set<number>>()
  defineIfMissing(
    Element.prototype,
    'hasPointerCapture',
    function hasPointerCapture(this: Element, pointerId: number): boolean {
      return captures.get(this)?.has(pointerId) ?? false
    },
  )
  defineIfMissing(
    Element.prototype,
    'setPointerCapture',
    function setPointerCapture(this: Element, pointerId: number): void {
      const pointers = captures.get(this) ?? new Set<number>()
      pointers.add(pointerId)
      captures.set(this, pointers)
    },
  )
  defineIfMissing(
    Element.prototype,
    'releasePointerCapture',
    function releasePointerCapture(this: Element, pointerId: number): void {
      captures.get(this)?.delete(pointerId)
    },
  )

  // scrollIntoView: Radix lo llama al abrir listas con una opción seleccionada.
  defineIfMissing(Element.prototype, 'scrollIntoView', () => undefined)

  // URL.createObjectURL / revokeObjectURL: las vistas previas de fotos usan URL `blob:`. jsdom
  // no las implementa; devolvemos una distinta por cada llamada.
  defineIfMissing(URL, 'createObjectURL', (): string => {
    blobCounter += 1
    return `blob:http://localhost/mock-${String(blobCounter)}`
  })
  defineIfMissing(URL, 'revokeObjectURL', () => undefined)

  // createImageBitmap: la validación de fotos lee las medidas con él. El bitmap falso mide
  // 1000 por 1000, para que una foto cualquiera cumpla las reglas de tamaño (800 px).
  defineIfMissing(globalThis, 'createImageBitmap', () =>
    Promise.resolve({ width: 1000, height: 1000, close: () => undefined }),
  )

  // Canvas: jsdom trae `getContext` y `toDataURL` como avisos de "no implementado" (devuelven
  // null y escriben un error en la consola), así que acá se reemplazan siempre por versiones
  // falsas. El contexto tiene solo lo que usa la reducción de fotos.
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    writable: true,
    value: function getContext(this: HTMLCanvasElement) {
      return {
        canvas: this,
        drawImage: () => undefined,
        fillRect: () => undefined,
        clearRect: () => undefined,
        save: () => undefined,
        restore: () => undefined,
        scale: () => undefined,
        translate: () => undefined,
      }
    },
  })
  Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
    configurable: true,
    writable: true,
    value: function toDataURL(type = 'image/png'): string {
      return `data:${type};base64,AAAA`
    },
  })
}

// Los tests que piden `@vitest-environment node` no tienen `window`: no hay nada que completar.
if (typeof window !== 'undefined') installPolyfills()
