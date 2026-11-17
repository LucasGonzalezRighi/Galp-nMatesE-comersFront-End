// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMe, isApiError } from '@galpon/api-client'
import { ACCOUNT_COPY } from './account.copy'
import { DeleteAccount } from './DeleteAccount'
import { createAccountTestApi, LUCIA, signUp } from './test/support'

/** Router simulado. */
const navigation = vi.hoisted(() => ({ replace: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: navigation.replace, push: navigation.replace, refresh: vi.fn() }),
  usePathname: () => '/cuenta',
  useSearchParams: () => new URLSearchParams(),
}))

beforeEach(() => {
  navigation.replace.mockReset()
})

afterEach(cleanup)

const COPY = ACCOUNT_COPY.deleteAccount

/** Abre el diálogo y escribe la contraseña (si hay), y confirma. */
async function confirmWith(password: string): Promise<HTMLElement> {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: COPY.open }))
  const dialog = await screen.findByRole('dialog', { name: COPY.dialogTitle })
  if (password !== '') await user.type(within(dialog).getByLabelText(COPY.password), password)
  await user.click(within(dialog).getByRole('button', { name: COPY.confirm }))
  return dialog
}

describe('DeleteAccount', () => {
  it('muestra el bloque con el título, la explicación y el botón', () => {
    render(createAccountTestApi().wrap(<DeleteAccount />))

    expect(screen.getByRole('heading', { level: 2, name: COPY.title })).toBeInTheDocument()
    expect(screen.getByText(COPY.text)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: COPY.open })).toBeInTheDocument()
  })

  it('con la contraseña vacía marca "Requerido" y no llama a la API', async () => {
    const testApi = createAccountTestApi()
    await signUp(testApi)
    render(testApi.wrap(<DeleteAccount />))
    const before = testApi.requests.length

    const dialog = await confirmWith('')

    expect(await within(dialog).findByText('Requerido')).toBeInTheDocument()
    expect(within(dialog).getByLabelText(COPY.password)).toHaveAttribute(
      'autocomplete',
      'current-password',
    )
    expect(testApi.requests.slice(before).some((request) => request.method === 'DELETE')).toBe(
      false,
    )
  })

  it('con la contraseña equivocada (422) muestra el mensaje bajo el campo y el diálogo sigue abierto', async () => {
    const testApi = createAccountTestApi()
    await signUp(testApi)
    render(testApi.wrap(<DeleteAccount />))

    const dialog = await confirmWith('otra-clave-123')

    expect(await within(dialog).findByText('La contraseña no es correcta')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: COPY.dialogTitle })).toBeInTheDocument()
    expect(navigation.replace).not.toHaveBeenCalled()
    expect(testApi.db.customers).toHaveLength(1)
  })

  it('con la contraseña correcta (204) borra la cuenta, limpia la sesión y lleva al inicio', async () => {
    const testApi = createAccountTestApi()
    await signUp(testApi)
    render(testApi.wrap(<DeleteAccount />))

    await confirmWith(LUCIA.password)

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith('/')
    })
    expect(testApi.db.customers).toHaveLength(0)
    expect(testApi.cookies.has('galpon_session')).toBe(false)
    const me = await getMe(testApi.api).catch((error: unknown) => error)
    expect(isApiError(me) && me.kind).toBe('unauthorized')
  })
})
