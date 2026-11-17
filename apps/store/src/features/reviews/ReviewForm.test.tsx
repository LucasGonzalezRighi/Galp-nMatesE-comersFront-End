// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TestApi } from './test/support'
import { ReviewForm } from './ReviewForm'
import { currentTestApi, useFreshTestApi } from './test/support'

// El formulario habla con la API simulada del test en lugar de la red.
vi.mock('../../lib/api.browser', async () => {
  const { currentTestApi: api } = await import('./test/support')
  return { getBrowserApi: api }
})

const SLUG = 'mate-imperial-premium'
const TEXT = 'La virola es una joya y el pie con las pelotitas le da presencia.'
const THANKS = 'Gracias, tu reseña se publica cuando la revisemos'

let mock: TestApi
let reviewsBefore = 0
const onClose = vi.fn()

beforeEach(() => {
  mock = useFreshTestApi()
  reviewsBefore = mock.db.reviews.length
  onClose.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
  cleanup()
})

/** Dibuja el formulario de la reseña del Mate Imperial Premium. */
function renderForm(): ReturnType<typeof userEvent.setup> {
  const user = userEvent.setup()
  render(<ReviewForm slug={SLUG} productName="Mate Imperial Premium" onClose={onClose} />)
  return user
}

/** La etiqueta (el área clicable) de una estrella, por su nombre accesible. */
function starLabel(name: string): HTMLElement {
  const label = screen.getByRole('radio', { name }).closest('label')
  if (label === null) throw new Error(`Falta la etiqueta de la estrella "${name}"`)
  return label
}

/** El campo trampa contra bots. */
function honeypot(): HTMLInputElement {
  const field = document.querySelector<HTMLInputElement>('input[name="website"]')
  if (field === null) throw new Error('Falta el campo trampa')
  return field
}

describe('ReviewForm', () => {
  it('muestra el título con el nombre del producto, las cinco estrellas y el aviso de privacidad', () => {
    renderForm()

    expect(
      screen.getByRole('heading', { name: 'Tu reseña de Mate Imperial Premium' }),
    ).toHaveFocus()
    expect(screen.getAllByRole('radio')).toHaveLength(5)
    expect(screen.getByText('Elegí una puntuación')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Política de privacidad' })).toHaveAttribute(
      'href',
      '/privacidad',
    )
  })

  it('el nombre es opcional, con su ayuda, y el aviso de publicación enlaza a Contacto y a Privacidad (LS-4)', () => {
    renderForm()

    const name = screen.getByRole('textbox', { name: 'Nombre (opcional)' })
    expect(name).toHaveAccessibleDescription(
      'Podés poner solo tu nombre de pila o tus iniciales. Si lo dejás vacío, se publica como "Anónimo".',
    )
    expect(document.querySelector('[data-review-notice]')).toHaveTextContent(
      'Tu nombre y tu reseña se publican en esta página. Las revisamos antes de publicarlas y no rechazamos ninguna por ser negativa. Si después querés que la borremos, escribinos desde Contacto. Más en la Política de privacidad.',
    )
    expect(screen.getByRole('link', { name: 'Contacto' })).toHaveAttribute('href', '/contacto')
    expect(screen.getByRole('button', { name: 'Publicar mi reseña' })).toBeInTheDocument()
    expect(document.querySelector('input[type="checkbox"]')).toBeNull()
  })

  it('las estrellas sin elegir van en neutral-500 (3:1 sobre el fondo, 1.4.11)', () => {
    renderForm()

    expect(starLabel('5 estrellas')).toHaveClass('text-neutral-500')
    expect(starLabel('5 estrellas')).not.toHaveClass('text-neutral-700')
  })

  it('las estrellas muestran su palabra al pasar el mouse y al elegirlas', async () => {
    const user = renderForm()

    await user.hover(starLabel('5 estrellas'))
    expect(screen.getByText('Excelente')).toBeVisible()
    await user.hover(starLabel('1 estrella'))
    expect(screen.getByText('Malo')).toBeVisible()

    await user.click(screen.getByRole('radio', { name: '4 estrellas' }))
    await user.unhover(starLabel('1 estrella'))
    expect(screen.getByText('Muy bueno')).toBeVisible()
  })

  it('con los campos vacíos marca los errores y no envía nada', async () => {
    const user = renderForm()

    await user.click(screen.getByRole('button', { name: 'Publicar mi reseña' }))

    expect(screen.getByText('Elegí una puntuación de 1 a 5 estrellas.')).toBeVisible()
    expect(screen.getByText('Contanos un poco más (mínimo 10 caracteres)')).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Reseña' })).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByText(THANKS)).toBeNull()
    expect(mock.db.reviews).toHaveLength(reviewsBefore)
  })

  it('el error de un campo desaparece al corregirlo', async () => {
    const user = renderForm()
    await user.click(screen.getByRole('button', { name: 'Publicar mi reseña' }))

    await user.click(screen.getByRole('radio', { name: '5 estrellas' }))
    await user.type(screen.getByRole('textbox', { name: 'Reseña' }), TEXT)

    expect(screen.queryByText('Elegí una puntuación de 1 a 5 estrellas.')).toBeNull()
    expect(screen.queryByText('Contanos un poco más (mínimo 10 caracteres)')).toBeNull()
  })

  it('un texto de menos de 10 caracteres es un error aunque haya puntuación', async () => {
    const user = renderForm()

    await user.click(screen.getByRole('radio', { name: '5 estrellas' }))
    await user.type(screen.getByRole('textbox', { name: 'Reseña' }), 'Lindo')
    await user.click(screen.getByRole('button', { name: 'Publicar mi reseña' }))

    expect(screen.getByText('Contanos un poco más (mínimo 10 caracteres)')).toBeVisible()
    expect(screen.queryByText('Elegí una puntuación de 1 a 5 estrellas.')).toBeNull()
    expect(mock.db.reviews).toHaveLength(reviewsBefore)
  })

  it('envía la reseña y muestra que se publica cuando la revisen', async () => {
    const user = renderForm()

    await user.click(screen.getByRole('radio', { name: '5 estrellas' }))
    await user.type(screen.getByRole('textbox', { name: 'Nombre (opcional)' }), 'Martina R.')
    await user.type(screen.getByRole('textbox', { name: 'Reseña' }), TEXT)
    await user.click(screen.getByRole('button', { name: 'Publicar mi reseña' }))

    expect(await screen.findByText(THANKS)).toBeVisible()
    expect(mock.db.reviews).toHaveLength(reviewsBefore + 1)
    expect(mock.db.reviews.at(-1)).toMatchObject({
      rating: 5,
      authorName: 'Martina R.',
      text: TEXT,
      status: 'pending',
    })

    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('sin nombre la reseña se firma como "Anónimo"', async () => {
    const user = renderForm()

    await user.click(screen.getByRole('radio', { name: '4 estrellas' }))
    await user.type(screen.getByRole('textbox', { name: 'Reseña' }), TEXT)
    await user.click(screen.getByRole('button', { name: 'Publicar mi reseña' }))

    await screen.findByText(THANKS)
    expect(mock.db.reviews.at(-1)).toMatchObject({ authorName: 'Anónimo', rating: 4 })
  })

  it('un bot que llena el campo trampa ve la confirmación pero no se guarda nada', async () => {
    const user = renderForm()

    await user.click(screen.getByRole('radio', { name: '5 estrellas' }))
    await user.type(screen.getByRole('textbox', { name: 'Reseña' }), TEXT)
    await user.type(honeypot(), 'https://spam.example')
    await user.click(screen.getByRole('button', { name: 'Publicar mi reseña' }))

    await screen.findByText(THANKS)
    expect(mock.db.reviews).toHaveLength(reviewsBefore)
  })

  it('el campo trampa no se ve ni se anuncia ni llega con el teclado', () => {
    renderForm()

    expect(honeypot()).toHaveAttribute('tabindex', '-1')
    expect(honeypot().closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('si la red falla muestra "No pudimos conectar, probá de nuevo" y deja reintentar', async () => {
    const user = renderForm()
    vi.spyOn(currentTestApi(), 'POST').mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await user.click(screen.getByRole('radio', { name: '5 estrellas' }))
    await user.type(screen.getByRole('textbox', { name: 'Reseña' }), TEXT)
    await user.click(screen.getByRole('button', { name: 'Publicar mi reseña' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos conectar, probá de nuevo',
    )
    expect(screen.getByRole('button', { name: 'Publicar mi reseña' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Publicar mi reseña' }))
    expect(await screen.findByText(THANKS)).toBeVisible()
  })

  it('Cancelar cierra el formulario sin enviar', async () => {
    const user = renderForm()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(mock.db.reviews).toHaveLength(reviewsBefore)
  })
})
