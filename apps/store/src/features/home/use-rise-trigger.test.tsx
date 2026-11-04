// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { act, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RiseTriggerOptions } from './use-rise-trigger'
import {
  cleanUpAfterEach,
  FakeIntersectionObserver,
  installIntersectionObserver,
  intersectAll,
  leaveAll,
} from '../../components/motion/test/support'
import { useRiseTrigger } from './use-rise-trigger'

cleanUpAfterEach()

beforeEach(() => {
  installIntersectionObserver()
})

/** Un elemento que dice si ya se disparó su entrada. */
function Probe(options: RiseTriggerOptions): ReactNode {
  const ref = useRef<HTMLDivElement>(null)
  const shown = useRiseTrigger(ref, options)
  return <div ref={ref}>{shown ? 'visible' : 'escondido'}</div>
}

describe('useRiseTrigger', () => {
  it('queda escondido hasta que el elemento entra en pantalla', () => {
    render(<Probe margin="0px 0px -22% 0px" resetBelow={false} />)
    expect(screen.getByText('escondido')).toBeInTheDocument()
    act(() => {
      intersectAll()
    })
    expect(screen.getByText('visible')).toBeInTheDocument()
  })

  it('le pasa el margen al observador', () => {
    const margins: (string | undefined)[] = []
    /** Anota el margen con que se crea cada observador. */
    class Recording extends FakeIntersectionObserver {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        super(callback)
        margins.push(options?.rootMargin)
      }
    }
    vi.stubGlobal('IntersectionObserver', Recording)
    render(<Probe margin="0px 0px -10% 0px" resetBelow />)
    expect(margins).toContain('0px 0px -10% 0px')
  })

  it('con resetBelow se rearma si sale por abajo y no si sale por arriba', () => {
    render(<Probe margin="0px 0px -22% 0px" resetBelow />)
    act(() => {
      intersectAll()
    })
    act(() => {
      leaveAll('above')
    })
    expect(screen.getByText('visible')).toBeInTheDocument()
    act(() => {
      leaveAll('below')
    })
    expect(screen.getByText('escondido')).toBeInTheDocument()
    act(() => {
      intersectAll()
    })
    expect(screen.getByText('visible')).toBeInTheDocument()
  })

  it('sin resetBelow entra una sola vez: salir por abajo no lo esconde', () => {
    render(<Probe margin="0px 0px -10% 0px" resetBelow={false} />)
    act(() => {
      intersectAll()
    })
    act(() => {
      leaveAll('below')
    })
    expect(screen.getByText('visible')).toBeInTheDocument()
  })

  it('sin IntersectionObserver se muestra igual (nunca queda escondido)', async () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    render(<Probe margin="0px" resetBelow />)
    expect(await screen.findByText('visible')).toBeInTheDocument()
  })

  it('lanza RangeError si el margen no es un margen de IntersectionObserver', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => render(<Probe margin="mucho" resetBelow={false} />)).toThrow(RangeError)
    expect(() => render(<Probe margin="0px 0px -10% 0px 4px" resetBelow={false} />)).toThrow(
      /margen/,
    )
  })
})
