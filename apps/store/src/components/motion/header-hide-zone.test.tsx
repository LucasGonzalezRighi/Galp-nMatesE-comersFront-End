// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { act, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it } from 'vitest'
import { registerHeaderHideZone, useHeaderHideZone, useHeaderMayHide } from './header-hide-zone'
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
