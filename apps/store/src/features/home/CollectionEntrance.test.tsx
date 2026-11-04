// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerHeaderHideZone, useHeaderMayHide } from '../../components/motion'
import {
  cleanUpAfterEach,
  installIntersectionObserver,
  intersectAll,
  leaveAll,
  mockReducedMotion,
} from '../../components/motion/test/support'
import { CollectionEntrance, EntranceCard, EntranceTitle } from './CollectionEntrance'
import { registerMateStage } from './mate-stage-presence'

cleanUpAfterEach()

let unregister: (() => void) | null = null

beforeEach(() => {
  mockReducedMotion(false)
  installIntersectionObserver()
  return () => {
    unregister?.()
    unregister = null
  }
})

/** Las líneas de prueba: seis, para ver el tope del escalonado. */
const LINES = ['Mates', 'Bombillas', 'Yerbas', 'Termos', 'Materas', 'Accesorios']

/** Muestra lo que lee el encabezado. */
function HeaderProbe(): ReactNode {
  return useHeaderMayHide() ? 'el encabezado puede esconderse' : 'el encabezado queda a la vista'
}

/** Dibuja la colección de prueba: el título, seis tarjetas con su link y, aparte, el encabezado. */
function renderCollection(): void {
  render(
    <>
      <HeaderProbe />
      <CollectionEntrance>
        <section aria-label="Líneas de producto">
          <EntranceTitle className="titulo">Categorías</EntranceTitle>
          {LINES.map((line, index) => (
            <EntranceCard key={line} index={index}>
              <a href={`/tienda/${line.toLowerCase()}`}>{line}</a>
            </EntranceCard>
          ))}
        </section>
      </CollectionEntrance>
    </>,
  )
}

/** El elemento con ese atributo, o un error si no está. */
function byData(attribute: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[${attribute}]`)
  if (element === null) throw new Error(`Falta [${attribute}].`)
  return element
}

/** La envoltura de la colección. */
function root(): HTMLElement {
  return byData('data-collection-entrance')
}

/** Las envolturas de las tarjetas, en orden. */
function cards(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-entrance-card]'))
}

/** La parte del título que sube con la máscara. */
function titleLine(): HTMLElement {
  return byData('data-entrance-title')
}

/** Si la colección, el título y todas las tarjetas están (`true`) o no (`false`) a la vista. */
function expectShown(shown: boolean): void {
  const value = String(shown)
  expect(root()).toHaveAttribute('data-shown', value)
  expect(titleLine()).toHaveAttribute('data-shown', value)
  for (const card of cards()) expect(card).toHaveAttribute('data-shown', value)
}

describe('CollectionEntrance', () => {
  it('el título sigue siendo el h2 de la sección, con su clase', () => {
    renderCollection()
    expect(screen.getByRole('heading', { level: 2, name: 'Categorías' })).toHaveClass('titulo')
  })

  it('con menos movimiento queda quieta: sin estilos en línea ni estados de entrada', () => {
    mockReducedMotion(true)
    unregister = registerMateStage()
    renderCollection()
    expect(root()).toHaveAttribute('data-collection-entrance', 'static')
    for (const element of [root(), titleLine(), ...cards()]) {
      expect(element.getAttribute('style')).toBeNull()
      expect(element).not.toHaveAttribute('data-shown')
      expect(element.className).not.toMatch(/opacity-0|translate/)
    }
    expect(root().className).not.toContain('-mt-')
  })

  describe('sin el escenario (celular, tableta, ventanas bajas)', () => {
    it('el título y las tarjetas esperan escondidos hasta entrar en pantalla, sin solaparse con nada', () => {
      renderCollection()
      expect(root()).toHaveAttribute('data-collection-entrance', 'rise')
      expect(root().className).not.toContain('-mt-')
      expectShown(false)
      // Lo demás de la fila (las flechas y el contador) también espera: entra con el título.
      expect(root()).toHaveClass('opacity-0')
      expect(titleLine().className).toContain('[transform:translateY(110%)]')
      for (const card of cards()) {
        expect(card.className).toContain('opacity-0')
        expect(card.className).toContain('[transform:translateY(48px)_scale(0.97)]')
        // Escondidas por clases, no con estilos en línea.
        expect(card.getAttribute('style')).toBeNull()
      }
      act(() => {
        intersectAll()
      })
      expectShown(true)
      expect(root()).toHaveClass('opacity-100')
      expect(titleLine().className).toContain('transform-none')
      for (const card of cards()) expect(card.className).toContain('opacity-100')
    })

    it('las tarjetas suben de a una: 70 ms después de la anterior, con tope en la quinta', () => {
      renderCollection()
      act(() => {
        intersectAll()
      })
      expect(cards().map((card) => card.style.transitionDelay)).toEqual([
        '0ms',
        '70ms',
        '140ms',
        '210ms',
        '280ms',
        '280ms',
      ])
    })

    it('entra una sola vez: salir por abajo no la esconde', () => {
      renderCollection()
      act(() => {
        intersectAll()
      })
      act(() => {
        leaveAll('below')
      })
      expectShown(true)
    })
  })

  describe('con el escenario del mate 3D', () => {
    beforeEach(() => {
      unregister = registerMateStage()
    })

    it('se monta 70 svh arriba, encima del final del escenario, sin tomar el mouse hasta entrar', () => {
      renderCollection()
      expect(root()).toHaveAttribute('data-collection-entrance', 'overlap')
      expect(root()).toHaveClass('pointer-events-none', 'relative', '-mt-[70vh]')
      expect(root().className).toContain('supports-[height:100svh]:-mt-[70svh]')
      expect(root().className).not.toContain('[&_section]:pointer-events-auto')
      expectShown(false)
      // Las flechas y el contador no quedan sobre la parada 3: esperan con el título.
      expect(root()).toHaveClass('opacity-0')
      act(() => {
        intersectAll()
      })
      expectShown(true)
      expect(root()).toHaveClass('opacity-100')
      // Ya a la vista, la fila (y sus flechas) toma el mouse; lo demás deja pasar al escenario.
      expect(root().className).toContain('[&_section]:pointer-events-auto')
    })

    it('se rearma si sale por abajo (volver a la parada 3) y no si sale por arriba', () => {
      renderCollection()
      act(() => {
        intersectAll()
      })
      act(() => {
        leaveAll('above')
      })
      expectShown(true)
      act(() => {
        leaveAll('below')
      })
      expectShown(false)
      // Al esconderse no espera: se va con un fundido corto, todas a la vez.
      for (const card of cards()) expect(card.style.transitionDelay).toBe('')
      act(() => {
        intersectAll()
      })
      expectShown(true)
    })

    it('el encabezado vuelve apenas se revela el título y se suelta si la colección se rearma', () => {
      let releaseZone = (): void => undefined
      act(() => {
        releaseZone = registerHeaderHideZone()
      })
      renderCollection()
      expect(screen.getByText('el encabezado puede esconderse')).toBeInTheDocument()
      act(() => {
        intersectAll()
      })
      expect(screen.getByText('el encabezado queda a la vista')).toBeInTheDocument()
      act(() => {
        leaveAll('below')
      })
      expect(screen.getByText('el encabezado puede esconderse')).toBeInTheDocument()
      act(() => {
        releaseZone()
      })
    })

    it('el foco muestra todo aunque no se haya disparado la entrada, y al irse vuelve a esperar', () => {
      renderCollection()
      expectShown(false)
      const link = screen.getByRole('link', { name: 'Yerbas' })
      act(() => {
        link.focus()
      })
      expectShown(true)
      act(() => {
        link.blur()
      })
      expectShown(false)
    })

    it('si el escenario se va (la ventana se achica), entra como en el celular', () => {
      renderCollection()
      act(() => {
        unregister?.()
        unregister = null
      })
      expect(root()).toHaveAttribute('data-collection-entrance', 'rise')
      expect(root().className).not.toContain('-mt-')
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
