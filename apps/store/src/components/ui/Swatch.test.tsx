// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Leather } from '@galpon/domain'
import { tokens } from '@galpon/design-tokens'
import { Swatch } from './Swatch'

afterEach(cleanup)

describe('Swatch', () => {
  it('se llama como el cuero y toma su color de los tokens', () => {
    render(<Swatch leather="Borravino" selected={false} />)

    const swatch = screen.getByRole('button', { name: 'Borravino' })
    expect(swatch).toHaveAttribute('aria-pressed', 'false')
    expect(swatch).toHaveStyle({ backgroundColor: tokens.leathersUi.Borravino })
  })

  it('marca el cuero elegido', () => {
    render(<Swatch leather="Crudo" selected />)

    expect(screen.getByRole('button', { name: 'Crudo' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('avisa el clic para que quien lo usa elija el cuero', async () => {
    const onClick = vi.fn()
    render(<Swatch leather="Negro" selected={false} onClick={onClick} />)

    await userEvent.click(screen.getByRole('button', { name: 'Negro' }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('rechaza un cuero que no existe', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(() => render(<Swatch leather={'Celeste' as Leather} selected={false} />)).toThrow(
      RangeError,
    )

    consoleError.mockRestore()
  })
})
