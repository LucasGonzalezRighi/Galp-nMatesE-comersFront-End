// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ScrollStage, useScrollStage } from './ScrollStage'
import { cleanUpAfterEach, mockReducedMotion } from './test/support'

cleanUpAfterEach()

/** Alto de la sección y distancia al principio de la página, en píxeles, para las pruebas. */
const SECTION_HEIGHT = 5000
const SECTION_TOP = 300

/** Scroll con el que la parada `index` de `stops` queda a la vista. */
function stopTop(index: number, stops: number): number {
  return SECTION_TOP + ((SECTION_HEIGHT - window.innerHeight) * index) / stops
}

beforeEach(() => {
  mockReducedMotion(false)
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(SECTION_HEIGHT)
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ x: 0, y: SECTION_TOP, width: 1440, height: SECTION_HEIGHT }),
  )
})

/** Lee el contexto del escenario y ofrece un botón para ir a cada parada. */
function Consumer({ stops }: { stops: number }): ReactNode {
  const stage = useScrollStage()
  return (
    <>
      <p>
        {stage.stops} paradas, avance {stage.progress.get()}
      </p>
      {Array.from({ length: stops }, (_, index) => (
        <div key={index} data-stage-stop={index}>
          <button
            type="button"
            onClick={() => {
              stage.scrollToStop(index)
            }}
          >
            Parada {index + 1}
          </button>
        </div>
      ))}
    </>
  )
}

describe('ScrollStage', () => {
  it('es una sección con nombre y un escenario fijo a la altura de la ventana', () => {
    render(
      <ScrollStage stops={4} label="El paseo">
        <Consumer stops={4} />
      </ScrollStage>,
    )
    const section = screen.getByRole('region', { name: 'El paseo' })
    expect(section).toHaveStyle({ '--stage-stops': '4' })
    expect(section.firstElementChild).toHaveStyle({ position: 'sticky', top: '0px' })
  })

  it('da por contexto la cantidad de paradas y el avance, que empieza en 0', () => {
    render(
      <ScrollStage stops={4} label="El paseo">
        <Consumer stops={4} />
      </ScrollStage>,
    )
    expect(screen.getByText('4 paradas, avance 0')).toBeInTheDocument()
  })

  it('scrollToStop desplaza la página suavemente al principio de esa parada', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
    render(
      <ScrollStage stops={4} label="El paseo">
        <Consumer stops={4} />
      </ScrollStage>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Parada 3' }))
    expect(scrollTo).toHaveBeenCalledWith({ top: stopTop(2, 4), behavior: 'smooth' })
  })

  it('con prefers-reduced-motion el salto es instantáneo', () => {
    mockReducedMotion(true)
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
    render(
      <ScrollStage stops={4} label="El paseo">
        <Consumer stops={4} />
      </ScrollStage>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Parada 4' }))
    expect(scrollTo).toHaveBeenCalledWith({ top: stopTop(3, 4), behavior: 'auto' })
  })

  it('enfocar algo de otra parada trae esa parada; en la actual no mueve nada', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
    render(
      <ScrollStage stops={4} label="El paseo">
        <Consumer stops={4} />
      </ScrollStage>,
    )
    fireEvent.focus(screen.getByRole('button', { name: 'Parada 1' }))
    expect(scrollTo).not.toHaveBeenCalled()
    fireEvent.focus(screen.getByRole('button', { name: 'Parada 2' }))
    expect(scrollTo).toHaveBeenCalledWith({ top: stopTop(1, 4), behavior: 'auto' })
  })

  it('lanza RangeError con una cantidad de paradas o una parada inválidas', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => render(<ScrollStage stops={0} label="El paseo" />)).toThrow(RangeError)
    let caught: unknown = null
    function OutOfRange(): ReactNode {
      const { scrollToStop } = useScrollStage()
      return (
        <button
          type="button"
          onClick={() => {
            try {
              scrollToStop(2)
            } catch (error) {
              caught = error
            }
          }}
        >
          Fuera de rango
        </button>
      )
    }
    render(
      <ScrollStage stops={2} label="El paseo">
        <OutOfRange />
      </ScrollStage>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Fuera de rango' }))
    expect(caught).toBeInstanceOf(RangeError)
  })

  it('useScrollStage fuera de un ScrollStage lanza un error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => render(<Consumer stops={1} />)).toThrow(/ScrollStage/)
  })
})
