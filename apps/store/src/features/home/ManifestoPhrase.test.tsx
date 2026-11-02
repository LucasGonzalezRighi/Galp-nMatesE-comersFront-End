// @vitest-environment jsdom

import type { RefObject } from 'react'
import { render, screen } from '@testing-library/react'
import { motionValue } from 'motion/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanUpAfterEach, mockReducedMotion } from '../../components/motion/test/support'
import { ManifestoPhrase } from './ManifestoPhrase'
import { PinnedManifesto } from './PinnedManifesto'

/** Lo que pidió cada `useScroll`: con qué tramo y sobre qué elemento. */
const scrolls = vi.hoisted((): { calls: { target: unknown; offset: unknown }[] } => ({ calls: [] }))

vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useScroll: (options: { target?: RefObject<Element | null>; offset?: unknown }) => {
    scrolls.calls.push({ target: options.target, offset: options.offset })
    return { scrollYProgress: motionValue(0) }
  },
}))

cleanUpAfterEach()

/** Simula una ventana de escritorio (1024 × 700 o más), con o sin menos movimiento. */
function mockDesktop(reduced: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: query.includes('prefers-reduced-motion') ? reduced : query.includes('min-width'),
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

/** El tramo con que se ilumina la frase de prueba. */
function phraseOffset(): unknown {
  const call = scrolls.calls.find(
    ({ offset }) =>
      Array.isArray(offset) &&
      (JSON.stringify(offset) === JSON.stringify(['start 85%', 'end 50%']) ||
        JSON.stringify(offset) === JSON.stringify(['start 85%', 'start 10%'])),
  )
  return call?.offset
}

beforeEach(() => {
  scrolls.calls = []
})

describe('ManifestoPhrase', () => {
  it('suelta se ilumina como ScrubText, midiendo la frase misma', () => {
    mockReducedMotion(false)
    render(<ManifestoPhrase text="Un mate no se compra" />)
    expect(screen.getByText('compra').tagName).toBe('SPAN')
    expect(phraseOffset()).toEqual(['start 85%', 'end 50%'])
  })

  it('clavada se ilumina con el recorrido de la pantalla y está entera antes de clavarse', () => {
    mockDesktop(false)
    const { container } = render(
      <PinnedManifesto
        manifesto={<ManifestoPhrase text="Un mate no se compra" />}
        stats={<p>Cifras</p>}
        kit={<p>Kit</p>}
      />,
    )
    const word = screen.getByText('compra')
    expect(word.tagName).toBe('SPAN')
    expect(word.style.opacity).toBe('0.14')
    expect(phraseOffset()).toEqual(['start 85%', 'start 10%'])
    // Mide el contenedor que se mueve con el scroll, no la pantalla clavada.
    const call = scrolls.calls.find(({ offset }) => phraseOffset() === offset)
    const target = (call?.target as RefObject<Element | null> | undefined)?.current
    expect(target).toBe(container.firstElementChild)
    expect(target?.querySelector('[data-manifesto-block]')).not.toBeNull()
  })

  it('con menos movimiento se ve entera, sin palabras sueltas', () => {
    mockDesktop(true)
    render(
      <PinnedManifesto
        manifesto={<ManifestoPhrase text="Un mate no se compra" />}
        stats={<p>Cifras</p>}
        kit={<p>Kit</p>}
      />,
    )
    expect(screen.getByText('Un mate no se compra').tagName).toBe('P')
  })

  it('lanza RangeError con una frase vacía', () => {
    mockReducedMotion(false)
    expect(() => render(<ManifestoPhrase text="   " />)).toThrow(RangeError)
  })
})
