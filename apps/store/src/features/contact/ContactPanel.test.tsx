// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Activity } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { CONTACT_COPY } from './contact.copy'
import { ContactPanel } from './ContactPanel'
import { createTestApi, offlineFetch, validationProblem } from './test/support'

afterEach(cleanup)

type User = ReturnType<typeof userEvent.setup>

/** Completa nombre, email y mensaje del formulario de contacto. */
async function fillContact(user: User, message = 'Mi pedido no llegó todavía'): Promise<void> {
  await user.type(screen.getByRole('textbox', { name: CONTACT_COPY.name }), 'Paula Núñez')
  await user.type(screen.getByRole('textbox', { name: CONTACT_COPY.email }), 'Paula@Ejemplo.com')
  await user.type(screen.getByRole('textbox', { name: CONTACT_COPY.message }), message)
}

describe('Contacto: formulario', () => {
  it('envía el mensaje y confirma con el nombre y el email que escribió la persona', async () => {
    const api = createTestApi()
    const user = userEvent.setup()
    render(api.wrap(<ContactPanel />))

    await fillContact(user)
    await user.click(screen.getByRole('button', { name: CONTACT_COPY.submit }))

    expect(
      await screen.findByText('Gracias, Paula Núñez. Te respondemos a paula@ejemplo.com.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: CONTACT_COPY.sentTitle })).toHaveFocus()
    expect(api.db.messages).toHaveLength(1)
    expect(api.db.messages[0]).toMatchObject({
      kind: 'contact',
      name: 'Paula Núñez',
      email: 'paula@ejemplo.com',
      reason: 'Pedido',
      message: 'Mi pedido no llegó todavía',
      orderNumber: null,
    })
  })

  it('"Escribir otro mensaje" vuelve al formulario vacío', async () => {
    const api = createTestApi()
    const user = userEvent.setup()
    render(api.wrap(<ContactPanel />))

    await fillContact(user)
    await user.click(screen.getByRole('button', { name: CONTACT_COPY.submit }))
    await user.click(await screen.findByRole('button', { name: CONTACT_COPY.another }))

    expect(screen.getByRole('textbox', { name: CONTACT_COPY.name })).toHaveValue('')
    expect(screen.getByRole('textbox', { name: CONTACT_COPY.message })).toHaveValue('')
  })

  it('no llama a la API y marca los campos si el mensaje es muy corto', async () => {
    const api = createTestApi()
    const user = userEvent.setup()
    render(api.wrap(<ContactPanel />))

    await fillContact(user, 'Hola')
    await user.click(screen.getByRole('button', { name: CONTACT_COPY.submit }))

    expect(screen.getByText('Escribí al menos 10 caracteres')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: CONTACT_COPY.message })).toBeInvalid()
    expect(api.requests).toHaveLength(0)
  })

  it('muestra por campo el error que devuelve la API (422)', async () => {
    const api = createTestApi(() =>
      Promise.resolve(validationProblem('orderNumber', 'No encontramos ese pedido')),
    )
    const user = userEvent.setup()
    render(api.wrap(<ContactPanel />))

    await fillContact(user)
    await user.click(screen.getByRole('button', { name: CONTACT_COPY.submit }))

    expect(await screen.findByText('No encontramos ese pedido')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: CONTACT_COPY.orderNumber })).toBeInvalid()
    expect(screen.queryByText(CONTACT_COPY.sentTitle)).not.toBeInTheDocument()
  })

  it('avisa "No pudimos conectar" si no hay red y conserva lo escrito', async () => {
    const api = createTestApi(offlineFetch)
    const user = userEvent.setup()
    render(api.wrap(<ContactPanel />))

    await fillContact(user)
    await user.click(screen.getByRole('button', { name: CONTACT_COPY.submit }))

    expect(await screen.findByRole('alert')).toHaveTextContent(CONTACT_COPY.networkError)
    expect(screen.getByRole('textbox', { name: CONTACT_COPY.name })).toHaveValue('Paula Núñez')
    expect(screen.getByRole('button', { name: CONTACT_COPY.submit })).toBeEnabled()
  })

  it('se reinicia cuando la página se oculta y vuelve (Cache Components con Activity)', async () => {
    const api = createTestApi()
    const user = userEvent.setup()
    const { rerender } = render(
      api.wrap(
        <Activity mode="visible">
          <ContactPanel />
        </Activity>,
      ),
    )
    await fillContact(user)
    await user.click(screen.getByRole('button', { name: CONTACT_COPY.submit }))
    await screen.findByText(CONTACT_COPY.sentTitle)

    for (const mode of ['hidden', 'visible'] as const) {
      await act(async () => {
        rerender(
          api.wrap(
            <Activity mode={mode}>
              <ContactPanel />
            </Activity>,
          ),
        )
        await Promise.resolve()
      })
    }

    expect(screen.queryByText(CONTACT_COPY.sentTitle)).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: CONTACT_COPY.name })).toHaveValue('')
  })
})

describe('Contacto: motivo "Arrepentimiento"', () => {
  it('ofrece los cinco motivos en un grupo que envuelve en pantallas angostas', () => {
    render(createTestApi().wrap(<ContactPanel />))

    const group = screen.getByRole('radiogroup', { name: CONTACT_COPY.reason })
    expect(group).toHaveClass('flex-wrap')
    expect(screen.getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual([
      'Pedido',
      'Envío',
      'Cambio',
      'Arrepentimiento',
      'Otro',
    ])
    expect(screen.getByRole('radio', { name: 'Pedido' })).toBeChecked()
  })

  it('cambia al formulario de arrepentimiento, que no pide número de pedido, y muestra el código', async () => {
    const api = createTestApi()
    const user = userEvent.setup()
    render(api.wrap(<ContactPanel />))
    expect(screen.queryByRole('button', { name: 'Solicitar arrepentimiento' })).toBeNull()

    await user.click(screen.getByRole('radio', { name: 'Arrepentimiento' }))

    expect(screen.queryByRole('button', { name: CONTACT_COPY.submit })).toBeNull()
    expect(screen.getByRole('radio', { name: 'Arrepentimiento' })).toHaveFocus()
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Paula Núñez')
    await user.type(
      screen.getByRole('textbox', { name: 'Email usado en la compra' }),
      'p@ejemplo.com',
    )
    await user.click(screen.getByRole('button', { name: 'Solicitar arrepentimiento' }))

    expect(await screen.findByText('ARR-000001')).toBeInTheDocument()
    expect(api.db.messages[0]).toMatchObject({ kind: 'withdrawal', orderNumber: null })
  })

  it('conserva lo escrito en el formulario de contacto al ir y volver', async () => {
    const user = userEvent.setup()
    render(createTestApi().wrap(<ContactPanel />))

    await user.type(screen.getByRole('textbox', { name: CONTACT_COPY.name }), 'Paula')
    await user.click(screen.getByRole('radio', { name: 'Arrepentimiento' }))
    await user.click(screen.getByRole('radio', { name: 'Envío' }))

    expect(screen.getByRole('textbox', { name: CONTACT_COPY.name })).toHaveValue('Paula')
    expect(screen.getByRole('radio', { name: 'Envío' })).toHaveFocus()
  })
})
