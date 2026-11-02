// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hideToast, showToast, TOAST_DURATION_MS, useToast } from './index'
import { Toaster } from './Toaster'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  act(() => {
    hideToast()
  })
  cleanup()
  vi.useRealTimers()
})

/** El contenedor del aviso, que lleva si está a la vista. */
function container(): HTMLElement {
  const element = document.querySelector('[data-visible]')
  if (!(element instanceof HTMLElement)) throw new Error('No se encontró el aviso')
  return element
}

describe('Toaster', () => {
  it('empieza oculto y sin anunciar nada', () => {
    render(<Toaster />)

    expect(container()).toHaveAttribute('data-visible', 'false')
    expect(container()).toHaveAttribute('inert')
    expect(screen.getByRole('status', { hidden: true })).toBeEmptyDOMElement()
  })

  it('muestra el título y el subtítulo y los anuncia como estado', () => {
    render(<Toaster />)

    act(() => {
      showToast({ title: 'Agregado al carrito', subtitle: 'Mate Imperial Premium' })
    })

    expect(container()).toHaveAttribute('data-visible', 'true')
    expect(container()).not.toHaveAttribute('inert')
    expect(screen.getByRole('status')).toHaveTextContent(
      'Agregado al carrito. Mate Imperial Premium',
    )
  })

  it('la región viva está siempre montada y fuera del bloque inert (si no, no se anuncia)', () => {
    render(<Toaster />)
    const region = screen.getByRole('status', { hidden: true })

    act(() => {
      showToast({ title: 'Agregado al carrito' })
    })

    expect(screen.getByRole('status')).toBe(region)
    expect(container().contains(region)).toBe(false)
    expect(region.closest('[inert]')).toBeNull()
  })

  it('el mismo aviso dos veces seguidas se vuelve a anunciar (cambia el nodo con el texto)', () => {
    render(<Toaster />)
    act(() => {
      showToast({ title: 'Agregado al carrito', subtitle: 'Mate Galleta' })
    })
    const first = screen.getByRole('status').firstElementChild

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    act(() => {
      showToast({ title: 'Agregado al carrito', subtitle: 'Mate Galleta' })
    })
    const second = screen.getByRole('status').firstElementChild

    expect(second).toHaveTextContent('Agregado al carrito. Mate Galleta')
    expect(second).not.toBe(first)
  })

  it('se oculta a los 2,8 segundos', () => {
    render(<Toaster />)
    act(() => {
      showToast({ title: 'Kit agregado al carrito' })
    })

    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS - 1)
    })
    expect(container()).toHaveAttribute('data-visible', 'true')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(container()).toHaveAttribute('data-visible', 'false')
  })

  it('un aviso nuevo reemplaza al anterior y reinicia el tiempo', () => {
    render(<Toaster />)
    act(() => {
      showToast({ title: 'Primero' })
    })
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    act(() => {
      showToast({ title: 'Segundo' })
    })
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(container()).toHaveAttribute('data-visible', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Segundo')
  })

  it('el botón llama a su acción y oculta el aviso', async () => {
    vi.useRealTimers()
    const onClick = vi.fn()
    render(<Toaster />)
    act(() => {
      showToast({ title: 'Agregado al carrito', action: { label: 'Ver carrito', onClick } })
    })

    await userEvent.click(screen.getByRole('button', { name: 'Ver carrito' }))

    expect(onClick).toHaveBeenCalledOnce()
    expect(container()).toHaveAttribute('data-visible', 'false')
  })

  it('hideToast lo oculta enseguida', () => {
    render(<Toaster />)
    act(() => {
      showToast({ title: 'Agregado al carrito' })
    })

    act(() => {
      hideToast()
    })

    expect(container()).toHaveAttribute('data-visible', 'false')
  })

  it('useToast devuelve siempre las mismas funciones', () => {
    expect(useToast()).toBe(useToast())
    expect(useToast().show).toBe(showToast)
  })

  it('rechaza un título vacío y un botón sin texto', () => {
    expect(() => {
      showToast({ title: '  ' })
    }).toThrow(RangeError)
    expect(() => {
      showToast({ title: 'Hola', action: { label: '', onClick: vi.fn() } })
    }).toThrow(RangeError)
  })
})
