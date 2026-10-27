// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ACCOUNT_COPY } from './account.copy'
import { ForgotPasswordForm } from './ForgotPasswordForm'
import { createAccountTestApi } from './test/support'

afterEach(cleanup)

describe('ForgotPasswordForm', () => {
  it('muestra el aviso de privacidad con link a /privacidad antes del botón (spec 14.6)', () => {
    render(createAccountTestApi().wrap(<ForgotPasswordForm />))

    const link = screen.getByRole('link', { name: ACCOUNT_COPY.privacyLink })
    expect(screen.getByText(new RegExp(ACCOUNT_COPY.privacyBefore))).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/privacidad')
    const submit = screen.getByRole('button', { name: ACCOUNT_COPY.forgot.submit })
    expect(link.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('pide el email y muestra la confirmación sin revelar si la cuenta existe', async () => {
    const user = userEvent.setup()
    const testApi = createAccountTestApi()
    render(testApi.wrap(<ForgotPasswordForm />))

    await user.type(screen.getByLabelText(ACCOUNT_COPY.email), 'nadie@ejemplo.com')
    await user.click(screen.getByRole('button', { name: ACCOUNT_COPY.forgot.submit }))

    expect(await screen.findByText(ACCOUNT_COPY.forgot.sentTitle)).toBeInTheDocument()
  })
})
