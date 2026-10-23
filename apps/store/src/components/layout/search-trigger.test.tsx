// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { closeSearch, openSearch, useSearchOpen } from './search-trigger'

/** Muestra el estado del buscador. */
function Probe(): ReactNode {
  return <p>{useSearchOpen() ? 'abierto' : 'cerrado'}</p>
}

afterEach(() => {
  closeSearch()
  cleanup()
})

describe('search-trigger', () => {
  it('empieza cerrado', () => {
    render(<Probe />)

    expect(screen.getByText('cerrado')).toBeVisible()
  })

  it('openSearch y closeSearch avisan a todos los que escuchan', () => {
    render(
      <>
        <Probe />
        <Probe />
      </>,
    )

    act(() => {
      openSearch()
    })
    expect(screen.getAllByText('abierto')).toHaveLength(2)

    act(() => {
      closeSearch()
    })
    expect(screen.getAllByText('cerrado')).toHaveLength(2)
  })

  it('pedir lo mismo dos veces no cambia nada', () => {
    render(<Probe />)

    act(() => {
      openSearch()
      openSearch()
    })

    expect(screen.getByText('abierto')).toBeVisible()
  })
})
