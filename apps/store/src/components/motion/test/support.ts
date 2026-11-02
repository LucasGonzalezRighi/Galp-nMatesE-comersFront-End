import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

/** Simula `window.matchMedia` con la preferencia de movimiento del usuario. */
export function mockReducedMotion(reduced: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: reduced && query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  })
}

/** `IntersectionObserver` de mentira: avisa que todo lo observado entró en pantalla a pedido. */
export class FakeIntersectionObserver implements IntersectionObserver {
  static instances: FakeIntersectionObserver[] = []
  readonly root = null
  readonly rootMargin = ''
  readonly scrollMargin = ''
  readonly thresholds: readonly number[] = []
  private readonly targets = new Set<Element>()
  private readonly callback: IntersectionObserverCallback

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    FakeIntersectionObserver.instances.push(this)
  }

  observe(target: Element): void {
    this.targets.add(target)
  }

  unobserve(target: Element): void {
    this.targets.delete(target)
  }

  disconnect(): void {
    this.targets.clear()
  }

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }

  /** Avisa que todos los elementos observados entraron en pantalla. */
  intersect(): void {
    const entries = [...this.targets].map((target): Partial<IntersectionObserverEntry> => ({
      isIntersecting: true,
      intersectionRatio: 1,
      target,
    }))
    this.callback(entries as IntersectionObserverEntry[], this)
  }
}

/**
 * Instala el `IntersectionObserver` de mentira. No borra los anteriores: Motion guarda y reutiliza
 * los observadores entre pruebas, así que los elementos de la prueba actual pueden estar en uno
 * viejo.
 */
export function installIntersectionObserver(): void {
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
}

/** Avisa a todos los observadores que lo observado entró en pantalla. */
export function intersectAll(): void {
  for (const observer of FakeIntersectionObserver.instances) observer.intersect()
}

/** Limpia el DOM y las simulaciones después de cada prueba (el setup de la tienda no lo hace). */
export function cleanUpAfterEach(): void {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })
}
