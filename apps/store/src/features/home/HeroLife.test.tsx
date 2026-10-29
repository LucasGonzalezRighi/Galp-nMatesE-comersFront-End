// @vitest-environment jsdom

import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanUpAfterEach } from '../../components/motion/test/support'
import { HeroLife } from './HeroLife'
import { MateSteam } from './MateSteam'
import { WORLD_MEDIA } from './world-media'

cleanUpAfterEach()

/** La boca del mate del cuadro de la portada. */
const MOUTH = WORLD_MEDIA.pieces.mouth ?? { x: 0.5, y: 0.5 }

/** Simula la ventana: ancho de escritorio o no y la preferencia de movimiento. */
function mockWindow({ wide, reduced }: { wide: boolean; reduced: boolean }): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string): Partial<MediaQueryList> => ({
      matches: query.includes('min-width') ? wide : reduced && query.includes('reduced-motion'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  })
}

/** Lo que se mueve en la portada, por su tipo. */
function life(): string[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-world-life]')).map(
    (element) => element.dataset.worldLife ?? '?',
  )
}

beforeEach(() => {
  // jsdom no dibuja en un lienzo ni tiene cuadros de animación de verdad.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})

describe('HeroLife', () => {
  it('en escritorio y con movimiento caen las hojas y sube el vapor de la boca del mate', () => {
    mockWindow({ wide: true, reduced: false })
    render(<HeroLife mouth={MOUTH} />)
    expect(life()).toEqual(['leaves', 'steam'])
  })

  it('en el celular la portada queda quieta', () => {
    mockWindow({ wide: false, reduced: false })
    render(<HeroLife mouth={MOUTH} />)
    expect(life()).toEqual([])
  })

  it('con menos movimiento no se monta nada', () => {
    mockWindow({ wide: true, reduced: true })
    render(<HeroLife mouth={MOUTH} />)
    expect(life()).toEqual([])
  })
})

describe('MateSteam', () => {
  it('son tres manchas que salen de la boca del mate una detrás de otra', () => {
    mockWindow({ wide: true, reduced: false })
    render(<MateSteam origin={{ x: 0.48, y: 0.56 }} />)
    const steam = document.querySelector<HTMLElement>('[data-world-life="steam"]')
    expect(steam).toHaveAttribute('aria-hidden', 'true')
    expect(steam?.style.left).toBe('48%')
    expect(steam?.style.top).toBe('56%')
    const puffs = Array.from(steam?.querySelectorAll<HTMLElement>('.home-steam') ?? [])
    expect(puffs.map((puff) => puff.style.animationDelay)).toEqual(['0ms', '3000ms', '6000ms'])
  })
})
