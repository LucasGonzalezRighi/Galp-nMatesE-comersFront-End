// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ReasonField } from './ReasonField'

afterEach(cleanup)

describe('ReasonField', () => {
  it('el marco y las separaciones del grupo de motivos usan el borde de los controles (WCAG 1.4.11)', () => {
    render(<ReasonField value="Pedido" onChange={vi.fn()} />)

    const group = screen.getByRole('radiogroup', { name: 'Motivo' })
    const frame = group.parentElement
    expect(frame?.className.split(' ')).toContain('border-neutral-600')
    expect(group.className.split(' ')).toContain('[&>label]:border-neutral-600')
    expect(frame?.className).not.toContain('border-divider')
    expect(group.className).not.toContain('[&>label]:border-divider')
  })
})
