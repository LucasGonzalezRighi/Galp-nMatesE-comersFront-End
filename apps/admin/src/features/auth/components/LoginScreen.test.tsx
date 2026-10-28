import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiClientProvider } from '@galpon/api-client/react'
import { createAdminApi } from '../../../lib/api'
import { parseAdminEnv } from '../../../lib/env'
import { LoginScreen } from './LoginScreen'

const env = parseAdminEnv({ VITE_MOCK_LATENCY_MS: '0' })

describe('LoginScreen', () => {
  it('titula con el h1 del kit (text-h3) y pone el título de la pestaña', () => {
    render(
      <ApiClientProvider client={createAdminApi(env, null).api}>
        <LoginScreen onSuccess={vi.fn()} />
      </ApiClientProvider>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Galpón Mates' })).toHaveClass('text-h3')
    expect(screen.getByText('Ingresá para administrar la tienda.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
    expect(document.title).toBe('Ingresar · Galpón Admin')
  })
})
