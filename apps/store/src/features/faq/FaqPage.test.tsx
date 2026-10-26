// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { FaqContent } from '@galpon/api-client'
import { FAQ_COPY } from './faq.copy'
import { FaqPage } from './FaqPage'

/** Tres categorías; "envios" no es la primera, para probar que el ancla la elige. */
const CONTENT: FaqContent = {
  categories: [
    {
      id: 'pagos',
      label: 'Pagos y cuotas',
      items: [
        { question: '¿Qué medios de pago aceptan?', answer: 'Mercado Pago.' },
        { question: '¿Puedo pagar en cuotas?', answer: 'Hasta 3 cuotas sin interés.' },
      ],
    },
    {
      id: 'envios',
      label: 'Envíos',
      items: [
        { question: '¿Hacen envíos a todo el país?', answer: 'Sí, a las 24 provincias.' },
        { question: '¿Cómo sigo mi pedido?', answer: 'Con el número de seguimiento.' },
      ],
    },
    {
      id: 'cambios',
      label: 'Cambios y devoluciones',
      items: [{ question: '¿Puedo cambiar un producto?', answer: 'Sí, dentro de los 10 días.' }],
    },
  ],
}

beforeEach(() => {
  window.location.hash = ''
})

afterEach(cleanup)

/** Categoría que está a la vista: el título de la lista. */
function currentCategory(): string | null {
  return screen.getByRole('heading', { level: 2 }).textContent
}

describe('FaqPage', () => {
  it('muestra el título y la primera categoría con su primera pregunta abierta', () => {
    render(<FaqPage content={CONTENT} />)

    expect(screen.getByRole('heading', { level: 1, name: FAQ_COPY.title })).toBeInTheDocument()
    expect(currentCategory()).toBe('Pagos y cuotas')
    expect(screen.getByRole('button', { name: /medios de pago/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByRole('button', { name: /en cuotas/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.getByRole('link', { name: FAQ_COPY.contact })).toHaveAttribute(
      'href',
      '/contacto',
    )
  })

  it('el ancla #envios abre la categoría Envíos con su primera pregunta abierta', () => {
    window.location.hash = '#envios'
    render(<FaqPage content={CONTENT} />)

    expect(currentCategory()).toBe('Envíos')
    expect(screen.getByRole('button', { name: 'Envíos' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /envíos a todo el país/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByText('Sí, a las 24 provincias.')).toBeVisible()
  })

  it('ignora un ancla que no es de ninguna categoría o está mal codificada', () => {
    window.location.hash = '#nada'
    const { unmount } = render(<FaqPage content={CONTENT} />)
    expect(currentCategory()).toBe('Pagos y cuotas')
    unmount()

    window.location.hash = '#%'
    render(<FaqPage content={CONTENT} />)
    expect(currentCategory()).toBe('Pagos y cuotas')
  })

  it('cambia de categoría cuando cambia el ancla con la página abierta', () => {
    render(<FaqPage content={CONTENT} />)

    act(() => {
      window.location.hash = '#cambios'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })

    expect(currentCategory()).toBe('Cambios y devoluciones')
  })

  it('un link a una categoría de esta misma página la abre', async () => {
    const user = userEvent.setup()
    render(
      <>
        <a href="#envios">Envíos y seguimiento</a>
        <FaqPage content={CONTENT} />
      </>,
    )

    await user.click(screen.getByRole('link', { name: 'Envíos y seguimiento' }))

    expect(currentCategory()).toBe('Envíos')
  })

  it('elegir una categoría con el botón muestra sus preguntas', async () => {
    const user = userEvent.setup()
    render(<FaqPage content={CONTENT} />)

    await user.click(screen.getByRole('button', { name: 'Cambios y devoluciones' }))

    expect(currentCategory()).toBe('Cambios y devoluciones')
    expect(screen.getByRole('button', { name: /cambiar un producto/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('el acordeón abre una pregunta por vez y deja cerrar la abierta', async () => {
    const user = userEvent.setup()
    render(<FaqPage content={CONTENT} />)
    const first = screen.getByRole('button', { name: /medios de pago/ })
    const second = screen.getByRole('button', { name: /en cuotas/ })

    await user.click(second)
    expect(second).toHaveAttribute('aria-expanded', 'true')
    expect(first).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('region', { name: /en cuotas/ })).not.toHaveAttribute('inert')
    expect(screen.getByText('Mercado Pago.').closest('[role="region"]')).toHaveAttribute('inert')

    await user.click(second)
    expect(second).toHaveAttribute('aria-expanded', 'false')
  })
})
