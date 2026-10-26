// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Activity } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { createTestApi, offlineFetch, validationProblem } from './test/support'
import { WITHDRAWAL_COPY } from './withdrawal.copy'
import { WithdrawalForm } from './WithdrawalForm'

afterEach(cleanup)

/** Completa nombre y email, que son lo único obligatorio. */
async function fillRequired(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.type(screen.getByRole('textbox', { name: WITHDRAWAL_COPY.name }), 'Paula Núñez')
  await user.type(screen.getByRole('textbox', { name: WITHDRAWAL_COPY.email }), 'paula@ejemplo.com')
}

describe('WithdrawalForm', () => {
  it('registra la solicitud sin número de pedido y muestra el código que devuelve la API', async () => {
    const api = createTestApi()
    const user = userEvent.setup()
    render(api.wrap(<WithdrawalForm />))

    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: WITHDRAWAL_COPY.submit }))

    expect(await screen.findByText('ARR-000001')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: WITHDRAWAL_COPY.receiptTitle })).toHaveFocus()
    expect(api.db.messages).toHaveLength(1)
    expect(api.db.messages[0]).toMatchObject({
      kind: 'withdrawal',
      name: 'Paula Núñez',
      email: 'paula@ejemplo.com',
      orderNumber: null,
      code: 'ARR-000001',
    })
  })

  it('manda el número de pedido y el comentario cuando se completan', async () => {
    const api = createTestApi()
    const user = userEvent.setup()
    render(api.wrap(<WithdrawalForm />))

    await fillRequired(user)
    await user.type(screen.getByRole('textbox', { name: WITHDRAWAL_COPY.orderNumber }), 'glp-12345')
    await user.type(
      screen.getByRole('textbox', { name: WITHDRAWAL_COPY.comment }),
      'No me quedó bien',
    )
    await user.click(screen.getByRole('button', { name: WITHDRAWAL_COPY.submit }))

    expect(await screen.findByText('ARR-000001')).toBeInTheDocument()
    expect(api.db.messages[0]).toMatchObject({
      orderNumber: 'GLP-12345',
      message: 'No me quedó bien',
    })
  })

  it('no llama a la API y marca los campos obligatorios si falta el nombre o el email', async () => {
    const api = createTestApi()
    const user = userEvent.setup()
    render(api.wrap(<WithdrawalForm />))

    await user.click(screen.getByRole('button', { name: WITHDRAWAL_COPY.submit }))

    expect(screen.getByRole('textbox', { name: WITHDRAWAL_COPY.name })).toBeInvalid()
    expect(screen.getByRole('textbox', { name: WITHDRAWAL_COPY.email })).toBeInvalid()
    expect(screen.getByText('Requerido')).toBeInTheDocument()
    expect(api.requests).toHaveLength(0)
  })

  it('muestra por campo el error que devuelve la API (422)', async () => {
    const api = createTestApi(() =>
      Promise.resolve(validationProblem('email', 'Ese email no es válido para el pedido')),
    )
    const user = userEvent.setup()
    render(api.wrap(<WithdrawalForm />))

    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: WITHDRAWAL_COPY.submit }))

    expect(await screen.findByText('Ese email no es válido para el pedido')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: WITHDRAWAL_COPY.email })).toBeInvalid()
    expect(screen.queryByText('ARR-000001')).not.toBeInTheDocument()
  })

  it('avisa "No pudimos conectar" si no hay red y deja reintentar', async () => {
    const api = createTestApi(offlineFetch)
    const user = userEvent.setup()
    render(api.wrap(<WithdrawalForm />))

    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: WITHDRAWAL_COPY.submit }))

    expect(await screen.findByRole('alert')).toHaveTextContent(WITHDRAWAL_COPY.networkError)
    expect(screen.getByRole('textbox', { name: WITHDRAWAL_COPY.name })).toHaveValue('Paula Núñez')
    expect(screen.getByRole('button', { name: WITHDRAWAL_COPY.submit })).toBeEnabled()
  })

  it('"Hacer otra solicitud" vuelve al formulario vacío', async () => {
    const api = createTestApi()
    const user = userEvent.setup()
    render(api.wrap(<WithdrawalForm />))

    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: WITHDRAWAL_COPY.submit }))
    await user.click(await screen.findByRole('button', { name: WITHDRAWAL_COPY.another }))

    expect(screen.getByRole('textbox', { name: WITHDRAWAL_COPY.name })).toHaveValue('')
  })

  it('muestra el aviso de privacidad con el link a /privacidad (spec 14.6)', () => {
    const api = createTestApi()
    render(api.wrap(<WithdrawalForm />))

    expect(
      screen.getByText(/Usamos tus datos solo para gestionar tu solicitud/),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: WITHDRAWAL_COPY.privacyLink })).toHaveAttribute(
      'href',
      '/privacidad',
    )
  })

  it('muestra lo que se le pasa en `leading` mientras no se envió', async () => {
    const api = createTestApi()
    const user = userEvent.setup()
    render(api.wrap(<WithdrawalForm leading={<p>Motivo de prueba</p>} />))
    expect(screen.getByText('Motivo de prueba')).toBeInTheDocument()

    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: WITHDRAWAL_COPY.submit }))
    await screen.findByText('ARR-000001')

    expect(screen.queryByText('Motivo de prueba')).not.toBeInTheDocument()
  })

  it('se reinicia cuando la página se oculta y vuelve (Cache Components con Activity)', async () => {
    const api = createTestApi()
    const user = userEvent.setup()
    const { rerender } = render(
      api.wrap(
        <Activity mode="visible">
          <WithdrawalForm />
        </Activity>,
      ),
    )
    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: WITHDRAWAL_COPY.submit }))
    await screen.findByText('ARR-000001')

    await act(async () => {
      rerender(
        api.wrap(
          <Activity mode="hidden">
            <WithdrawalForm />
          </Activity>,
        ),
      )
      await Promise.resolve()
    })
    await act(async () => {
      rerender(
        api.wrap(
          <Activity mode="visible">
            <WithdrawalForm />
          </Activity>,
        ),
      )
      await Promise.resolve()
    })

    expect(screen.queryByText('ARR-000001')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: WITHDRAWAL_COPY.name })).toHaveValue('')
  })
})
