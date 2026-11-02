// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Reveal } from './Reveal'
import { RiseText } from './RiseText'
import {
  cleanUpAfterEach,
  installIntersectionObserver,
  intersectAll,
  mockReducedMotion,
} from './test/support'

cleanUpAfterEach()

describe('Reveal con prefers-reduced-motion: reduce', () => {
  it('muestra el contenido visible y en su estado final, sin transformaciones', () => {
    mockReducedMotion(true)
    installIntersectionObserver()
    render(<Reveal kind="up">Hola</Reveal>)
    const element = screen.getByText('Hola')
    expect(element).toBeVisible()
    expect(element.style.opacity).toBe('')
    expect(element.style.transform).toBe('')
  })

  it('en todas las formas el contenido queda visible', () => {
    mockReducedMotion(true)
    installIntersectionObserver()
    for (const kind of ['up', 'rise', 'fade', 'scale', 'left', 'clip', 'bar'] as const) {
      const { unmount } = render(<Reveal kind={kind}>{`Texto ${kind}`}</Reveal>)
      expect(screen.getByText(`Texto ${kind}`)).toBeVisible()
      unmount()
    }
  })
})

describe('Reveal con movimiento', () => {
  it('parte oculto y llega a mostrarse al entrar en pantalla', async () => {
    mockReducedMotion(false)
    installIntersectionObserver()
    render(
      <Reveal kind="up" duration={30}>
        Hola
      </Reveal>,
    )
    const element = screen.getByText('Hola')
    expect(element).not.toBeVisible()
    act(() => {
      intersectAll()
    })
    await waitFor(() => {
      expect(element).toHaveStyle({ opacity: '1' })
    })
    expect(element).toBeVisible()
  })

  it('rise observa la capa externa y anima la interna', async () => {
    mockReducedMotion(false)
    installIntersectionObserver()
    render(
      <Reveal kind="rise" as="span" duration={30} contentClassName="linea">
        Título
      </Reveal>,
    )
    const inner = screen.getByText('Título')
    expect(inner).toHaveClass('linea')
    expect(inner.style.transform).toContain('108%')
    const outer = inner.parentElement
    expect(outer).toHaveStyle({ overflow: 'hidden' })
    act(() => {
      intersectAll()
    })
    await waitFor(() => {
      expect(inner.style.transform).not.toContain('108%')
    })
  })

  it('sin IntersectionObserver muestra el contenido en vez de dejarlo oculto', () => {
    mockReducedMotion(false)
    render(<Reveal kind="scale">Hola</Reveal>)
    expect(screen.getByText('Hola')).toBeVisible()
  })

  it('rechaza retardos y duraciones negativos con RangeError en español', () => {
    expect(() => Reveal({ delay: -1 })).toThrow(RangeError)
    expect(() => Reveal({ duration: Number.NaN })).toThrow(/duration tiene que ser un número/)
  })
})

describe('RiseText', () => {
  it('muestra cada línea y escalona el retardo', () => {
    mockReducedMotion(true)
    render(<RiseText as="h1" lines={['Encontrá', 'tu mate']} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Encontrátu mate')
    expect(screen.getByText('Encontrá')).toBeVisible()
    expect(screen.getByText('tu mate')).toBeVisible()
  })

  it('exige al menos una línea', () => {
    expect(() => RiseText({ lines: [] })).toThrow(/al menos una línea/)
    expect(() => RiseText({ lines: ['a'], stagger: -5 })).toThrow(RangeError)
  })
})
