// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ACCOUNT_COPY } from './account.copy'
import { AddressBook } from './AddressBook'
import { createAccountTestApi, signUp } from './test/support'

afterEach(cleanup)

const COPY = ACCOUNT_COPY.addresses

describe('AddressBook', () => {
  it('agrega, edita y borra una dirección con el token CSRF de la sesión', async () => {
    const testApi = createAccountTestApi()
    await signUp(testApi)
    const user = userEvent.setup()
    render(testApi.wrap(<AddressBook initialAddresses={[]} />))

    // Vacío.
    expect(screen.getByText(COPY.empty)).toBeInTheDocument()

    // Alta.
    await user.click(screen.getByRole('button', { name: COPY.add }))
    await user.type(screen.getByLabelText(COPY.label), 'Casa')
    await user.type(screen.getByLabelText(COPY.street), 'Av. Corrientes')
    await user.type(screen.getByLabelText(COPY.number), '1234')
    await user.type(screen.getByLabelText(COPY.postalCode), 'c1043')
    await user.type(screen.getByLabelText(COPY.city), 'CABA')
    await user.selectOptions(screen.getByLabelText(COPY.province), 'CABA')
    await user.click(screen.getByLabelText(COPY.isDefault))
    await user.click(screen.getByRole('button', { name: COPY.save }))

    const card = await screen.findByRole('listitem')
    expect(within(card).getByText('Casa')).toBeInTheDocument()
    expect(within(card).getByText(COPY.defaultTag)).toBeInTheDocument()
    expect(within(card).getByText('Av. Corrientes 1234')).toBeInTheDocument()
    expect(within(card).getByText('C1043 CABA, CABA')).toBeInTheDocument()
    const [customer] = testApi.db.customers
    expect(customer?.addresses).toHaveLength(1)
    const create = testApi.requests.find(
      (request) => request.method === 'POST' && request.url.endsWith('/me/addresses'),
    )
    expect(create?.headers.get('X-CSRF-Token')).toEqual(expect.any(String))

    // Edición.
    await user.click(within(card).getByRole('button', { name: `${COPY.edit} Casa` }))
    const street = screen.getByLabelText(COPY.street)
    expect(street).toHaveValue('Av. Corrientes')
    await user.clear(street)
    await user.type(street, 'Av. Santa Fe')
    await user.click(screen.getByRole('button', { name: COPY.save }))

    expect(await screen.findByText('Av. Santa Fe 1234')).toBeInTheDocument()
    expect(customer?.addresses[0]?.street).toBe('Av. Santa Fe')

    // Baja, con confirmación.
    await user.click(screen.getByRole('button', { name: `${COPY.remove} Casa` }))
    await user.click(screen.getByRole('button', { name: COPY.confirmRemoveYes }))

    await waitFor(() => {
      expect(screen.getByText(COPY.empty)).toBeInTheDocument()
    })
    expect(testApi.db.customers[0]?.addresses).toHaveLength(0)
  })

  it('no guarda una dirección incompleta y marca los campos', async () => {
    const testApi = createAccountTestApi()
    await signUp(testApi)
    const user = userEvent.setup()
    render(testApi.wrap(<AddressBook initialAddresses={[]} />))

    await user.click(screen.getByRole('button', { name: COPY.add }))
    await user.click(screen.getByRole('button', { name: COPY.save }))

    await waitFor(() => {
      expect(screen.getByLabelText(COPY.province)).toHaveAccessibleDescription(
        'Elegí una provincia',
      )
    })
    expect(screen.getByLabelText(COPY.street)).toHaveFocus()
    expect(
      testApi.requests.some(
        (request) => request.method === 'POST' && request.url.endsWith('/me/addresses'),
      ),
    ).toBe(false)
  })
})
