// @vitest-environment jsdom
import { act } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CountUp } from './CountUp'
import { Reveal } from './Reveal'
import { cleanUpAfterEach, installIntersectionObserver, mockReducedMotion } from './test/support'

cleanUpAfterEach()

/** Hidrata el HTML del servidor en un contenedor, como hace Next en el navegador. */
function hydrate(html: string, element: React.JSX.Element): HTMLElement {
  const container = document.createElement('div')
  container.innerHTML = html
  document.body.append(container)
  act(() => {
    hydrateRoot(container, element)
  })
  return container
}

describe('hidratación', () => {
  it('Reveal: el servidor lo deja oculto y con prefers-reduced-motion queda visible al hidratar', () => {
    const element = (
      <Reveal kind="up" as="p">
        Hola
      </Reveal>
    )
    const html = renderToString(element)
    expect(html).toContain('opacity:0')

    mockReducedMotion(true)
    installIntersectionObserver()
    const container = hydrate(html, element)
    const paragraph = container.querySelector('p')
    expect(paragraph).toHaveTextContent('Hola')
    expect(paragraph).toBeVisible()
    expect(paragraph?.style.opacity).toBe('')
  })

  it('Reveal rise: con prefers-reduced-motion el texto enmascarado queda en su sitio', () => {
    const element = (
      <Reveal kind="rise" as="span">
        Título
      </Reveal>
    )
    const html = renderToString(element)
    expect(html).toContain('translateY(108%)')

    mockReducedMotion(true)
    installIntersectionObserver()
    const container = hydrate(html, element)
    const inner = container.querySelector('span > span')
    expect(inner).toHaveTextContent('Título')
    expect((inner as HTMLElement).style.transform).toBe('')
  })

  it('CountUp: el HTML del servidor ya trae el valor final', () => {
    const html = renderToString(<CountUp value={1234.5} decimals={1} />)
    expect(html).toContain('1.234,5')
    expect(html).not.toContain('>0,0<')
  })
})
