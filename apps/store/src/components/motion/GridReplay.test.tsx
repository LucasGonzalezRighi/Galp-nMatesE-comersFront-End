// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GridReplay } from './GridReplay'
import { TabFade } from './TabFade'
import { cleanUpAfterEach, mockReducedMotion } from './test/support'

cleanUpAfterEach()

const CARDS = ['Uno', 'Dos', 'Tres', 'Cuatro']

/** Dibuja la grilla con las tarjetas de ejemplo. */
function grid(replayKey: string, step?: number): React.JSX.Element {
  return (
    <GridReplay replayKey={replayKey} step={step}>
      {CARDS.map((name) => (
        <article key={name}>{name}</article>
      ))}
    </GridReplay>
  )
}

describe('GridReplay', () => {
  it('en la primera carga no oculta ni anima las tarjetas', () => {
    mockReducedMotion(false)
    render(grid('a'))
    for (const name of CARDS) expect(screen.getByText(name)).toBeVisible()
    expect(screen.getByText('Dos').parentElement?.style.opacity).toBe('')
  })

  it('al cambiar replayKey las tarjetas vuelven a entrar, ocultas al principio', () => {
    mockReducedMotion(false)
    const { rerender } = render(grid('a'))
    rerender(grid('b'))
    // Las que tienen retardo todavía no se ven; el escalón es de 45 ms por tarjeta.
    expect(screen.getByText('Cuatro').parentElement?.style.opacity).toBe('0')
    expect(screen.getByText('Cuatro')).not.toBeVisible()
  })

  it('con prefers-reduced-motion las tarjetas nunca se ocultan', () => {
    mockReducedMotion(true)
    const { rerender } = render(grid('a'))
    rerender(grid('b'))
    for (const name of CARDS) expect(screen.getByText(name)).toBeVisible()
  })

  it('rechaza un escalón negativo', () => {
    expect(() => GridReplay({ replayKey: 'a', step: -45 })).toThrow(RangeError)
  })
})

describe('TabFade', () => {
  it('no anima la primera carga y vuelve a entrar al cambiar de pestaña', () => {
    mockReducedMotion(false)
    const { rerender } = render(<TabFade tabKey="descripcion">Texto A</TabFade>)
    expect(screen.getByText('Texto A')).toBeVisible()
    rerender(<TabFade tabKey="materiales">Texto B</TabFade>)
    expect(screen.getByText('Texto B').style.opacity).toBe('0')
  })

  it('con prefers-reduced-motion el panel siempre se ve', () => {
    mockReducedMotion(true)
    const { rerender } = render(<TabFade tabKey="a">Texto A</TabFade>)
    rerender(<TabFade tabKey="b">Texto B</TabFade>)
    expect(screen.getByText('Texto B')).toBeVisible()
  })
})
