// @vitest-environment jsdom

import type { MotionValue } from 'motion/react'
import { act, render, screen } from '@testing-library/react'
import { motionValue } from 'motion/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanUpAfterEach,
  installIntersectionObserver,
  mockReducedMotion,
} from '../../components/motion/test/support'
import { CollectionEntrance, EntranceCard, EntranceTitle } from './CollectionEntrance'
import { registerMateStage } from './mate-stage-presence'

/** El avance del scroll de la colección, que cada prueba mueve a mano (jsdom no hace scroll). */
const scroll = vi.hoisted((): { progress: unknown } => ({ progress: null }))

vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useScroll: (): { scrollYProgress: unknown } => ({ scrollYProgress: scroll.progress }),
}))

cleanUpAfterEach()

let progress: MotionValue<number>
let unregister: (() => void) | null = null

beforeEach(() => {
  progress = motionValue(0)
  scroll.progress = progress
  mockReducedMotion(false)
  installIntersectionObserver()
  return () => {
    unregister?.()
    unregister = null
  }
})

/**
 * Lleva la colección a un avance y espera un cuadro: Motion escribe los estilos ligados al scroll en
 * el cuadro siguiente.
 */
async function moveTo(value: number): Promise<void> {
  await act(async () => {
    progress.set(value)
    await new Promise((resolve) => setTimeout(resolve, 40))
  })
}

/** Dibuja la colección de prueba: el título y dos tarjetas. */
function renderCollection(): void {
  render(
    <CollectionEntrance>
      <EntranceTitle className="titulo">Seis líneas para cada ronda</EntranceTitle>
      <EntranceCard index={0}>
        <p>Mates</p>
      </EntranceCard>
      <EntranceCard index={1}>
        <p>Bombillas</p>
      </EntranceCard>
    </CollectionEntrance>,
  )
}

/** El elemento con ese atributo, o un error si no está. */
function byData(attribute: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[${attribute}]`)
  if (element === null) throw new Error(`Falta [${attribute}].`)
  return element
}

/** Las envolturas de las tarjetas, en orden. */
function cards(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-entrance-card]'))
}

/** La parte del título que sube con la máscara. */
function titleLine(): HTMLElement {
  return byData('data-entrance-title')
}

describe('CollectionEntrance', () => {
  it('el título sigue siendo el h2 de la sección, con su clase', () => {
    renderCollection()
    const heading = screen.getByRole('heading', { level: 2, name: 'Seis líneas para cada ronda' })
    expect(heading).toHaveClass('titulo')
  })

  it('con menos movimiento no hay capa de yerba ni estilos de entrada: todo queda quieto', () => {
    mockReducedMotion(true)
    unregister = registerMateStage()
    renderCollection()
    expect(byData('data-collection-entrance').getAttribute('data-collection-entrance')).toBe(
      'static',
    )
    expect(document.querySelector('[data-collection-bridge]')).toBeNull()
    expect(titleLine().getAttribute('style')).toBeNull()
    for (const card of cards()) expect(card.getAttribute('style')).toBeNull()
    expect(byData('data-collection-entrance').getAttribute('style')).toBeNull()
  })

  it('sin el escenario (celular) entra con un fundido simple, sin capa de yerba ni profundidad', () => {
    renderCollection()
    const root = byData('data-collection-entrance')
    expect(root.getAttribute('data-collection-entrance')).toBe('fade')
    expect(root.style.opacity).toBe('0')
    expect(document.querySelector('[data-collection-bridge]')).toBeNull()
    for (const card of cards()) expect(card.getAttribute('style')).toBeNull()
    expect(titleLine().getAttribute('style')).toBeNull()
  })

  describe('después del mate 3D', () => {
    beforeEach(() => {
      unregister = registerMateStage()
    })

    it('arranca desde la yerba: la capa a pantalla completa y las tarjetas en la profundidad', () => {
      renderCollection()
      const root = byData('data-collection-entrance')
      expect(root.getAttribute('data-collection-entrance')).toBe('dive')
      // Mientras la colección no asoma, la capa de yerba no se ve (la del escenario la tapa).
      expect(byData('data-collection-bridge').style.visibility).toBe('hidden')
      expect(titleLine().style.transform).toBe('translateY(110%)')
      for (const card of cards()) {
        expect(card.style.transform).toContain('translateZ(-600px)')
        expect(card.style.filter).toBe('blur(12px)')
        expect(card.style.opacity).toBe('0')
      }
    })

    it('al asomar la colección la yerba se ve entera y después se aleja y se disuelve', async () => {
      renderCollection()
      await moveTo(0.02)
      const bridge = byData('data-collection-bridge')
      const yerba = byData('data-collection-yerba')
      expect(bridge.style.visibility).toBe('visible')
      expect(Number(yerba.style.opacity)).toBeGreaterThan(0.95)
      // A mitad de la entrada la yerba sigue detrás del título y de las tarjetas: ya se alejó.
      await moveTo(0.4)
      expect(Number(yerba.style.opacity)).toBeGreaterThan(0.95)
      expect(yerba.style.filter).toMatch(/blur/)
      // Se disuelve con la colección ya arriba, hasta que la capa se esconde.
      await moveTo(0.8)
      expect(Number(yerba.style.opacity)).toBeLessThan(0.6)
      await moveTo(0.999)
      expect(Number(yerba.style.opacity)).toBeLessThan(0.01)
    })

    it('la colección termina visible y sin transformaciones, y la capa de yerba ya no se ve', async () => {
      renderCollection()
      await moveTo(1)
      expect(byData('data-collection-bridge').style.visibility).toBe('hidden')
      expect(titleLine().style.transform).toBe('none')
      for (const card of cards()) {
        expect(card.style.transform).toBe('none')
        expect(card.style.filter).toBe('none')
        expect(card.style.opacity).toBe('1')
      }
    })

    it('si el escenario se va (la ventana se achica), vuelve al fundido simple', () => {
      renderCollection()
      act(() => {
        unregister?.()
        unregister = null
      })
      expect(byData('data-collection-entrance').getAttribute('data-collection-entrance')).toBe(
        'fade',
      )
      expect(document.querySelector('[data-collection-bridge]')).toBeNull()
    })
  })

  it('EntranceCard lanza RangeError si la posición no es un entero desde 0', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() =>
      render(
        <CollectionEntrance>
          <EntranceCard index={-1}>
            <p>Mates</p>
          </EntranceCard>
        </CollectionEntrance>,
      ),
    ).toThrow(RangeError)
  })
})
