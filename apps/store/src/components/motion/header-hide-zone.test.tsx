// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { act, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it } from 'vitest'
import {
  registerHeaderHideZone,
  registerHeaderPin,
  useHeaderHideZone,
  useHeaderMayHide,
  useHeaderPin,
} from './header-hide-zone'
import { cleanUpAfterEach, installIntersectionObserver, intersectAll } from './test/support'

cleanUpAfterEach()

/** Muestra si el encabezado puede esconderse. */
function Probe(): ReactNode {
  return useHeaderMayHide() ? 'puede esconderse' : 'queda a la vista'
}

/** Una zona (como el escenario del mate) que avisa mientras se ve. */
function Zone(): ReactNode {
  const ref = useRef<HTMLDivElement>(null)
  useHeaderHideZone(ref)
  return <div ref={ref} />
}

describe('registerHeaderHideZone y useHeaderMayHide', () => {
  it('sin zonas a la vista el encabezado no puede esconderse; con una, sí; al retirarla, vuelve', () => {
    render(<Probe />)
    expect(screen.getByText('queda a la vista')).toBeInTheDocument()
    let release = (): void => undefined
    act(() => {
      release = registerHeaderHideZone()
    })
    expect(screen.getByText('puede esconderse')).toBeInTheDocument()
    act(() => {
      release()
      // Retirarla dos veces no descuenta otra zona.
      release()
    })
    expect(screen.getByText('queda a la vista')).toBeInTheDocument()
  })
})

describe('useHeaderHideZone', () => {
  it('avisa recién cuando la zona entra en pantalla y deja de avisar al desmontarse', () => {
    installIntersectionObserver()
    const { rerender } = render(
      <>
        <Probe />
        <Zone />
      </>,
    )
    expect(screen.getByText('queda a la vista')).toBeInTheDocument()
    act(() => {
      intersectAll()
    })
    expect(screen.getByText('puede esconderse')).toBeInTheDocument()
    rerender(<Probe />)
    expect(screen.getByText('queda a la vista')).toBeInTheDocument()
  })
})

/** Props de {@link Pin}. */
interface PinProps {
  /** Si fija el encabezado. */
  active: boolean
}

/** Algo (como el título de la colección ya revelado) que deja el encabezado a la vista mientras `active`. */
function Pin({ active }: PinProps): ReactNode {
  useHeaderPin(active)
  return null
}

describe('registerHeaderPin y useHeaderPin', () => {
  it('con una zona y un pin el encabezado no puede esconderse; al soltar el pin, sí', () => {
    render(<Probe />)
    let releaseZone = (): void => undefined
    let releasePin = (): void => undefined
    act(() => {
      releaseZone = registerHeaderHideZone()
      releasePin = registerHeaderPin()
    })
    expect(screen.getByText('queda a la vista')).toBeInTheDocument()
    act(() => {
      releasePin()
      // Soltarlo dos veces no descuenta otro pin.
      releasePin()
    })
    expect(screen.getByText('puede esconderse')).toBeInTheDocument()
    act(() => {
      releaseZone()
    })
    expect(screen.getByText('queda a la vista')).toBeInTheDocument()
  })

  it('useHeaderPin fija el encabezado mientras está activo y lo suelta al apagarse o desmontarse', () => {
    let releaseZone = (): void => undefined
    act(() => {
      releaseZone = registerHeaderHideZone()
    })
    const { rerender } = render(
      <>
        <Probe />
        <Pin active={false} />
      </>,
    )
    expect(screen.getByText('puede esconderse')).toBeInTheDocument()
    rerender(
      <>
        <Probe />
        <Pin active />
      </>,
    )
    expect(screen.getByText('queda a la vista')).toBeInTheDocument()
    rerender(
      <>
        <Probe />
        <Pin active={false} />
      </>,
    )
    expect(screen.getByText('puede esconderse')).toBeInTheDocument()
    rerender(
      <>
        <Probe />
        <Pin active />
      </>,
    )
    rerender(<Probe />)
    expect(screen.getByText('puede esconderse')).toBeInTheDocument()
    act(() => {
      releaseZone()
    })
  })
})
