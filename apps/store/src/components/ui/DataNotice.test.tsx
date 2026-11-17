// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DataNotice } from './DataNotice'

afterEach(cleanup)

describe('DataNotice', () => {
  it('dice para qué son los datos, los derechos y enlaza a la política de privacidad', () => {
    const { container } = render(
      <DataNotice purpose="Usamos tus datos solo para responderte." className="mt-2" />,
    )

    const notice = container.querySelector('p')
    expect(notice).toHaveTextContent(
      'Usamos tus datos solo para responderte. Podés pedir ver, corregir o borrar tus datos. Más en la Política de privacidad.',
    )
    expect(notice).toHaveClass('mt-2')
    expect(screen.getByRole('link', { name: 'Política de privacidad' })).toHaveAttribute(
      'href',
      '/privacidad',
    )
    expect(container.querySelector('input[type="checkbox"]')).toBeNull()
  })

  it('lanza RangeError sin propósito', () => {
    expect(() => render(<DataNotice purpose="  " />)).toThrow(RangeError)
  })
})
