import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { BadgeTone } from './Badge'
import { Badge } from './Badge'

/** Un valor que no es un tono, tipado como `string` para poder forzarlo. */
function unknownTone(): string {
  return 'violeta'
}

describe('Badge', () => {
  it('es un tag de 11 px con radio de 6 px', () => {
    render(<Badge tone="accent">En curso</Badge>)

    expect(screen.getByText('En curso')).toHaveClass('text-[11px]', 'rounded-tag')
  })

  it.each<[BadgeTone, string]>([
    ['accent', 'text-accent-100'],
    ['success', 'text-accent-2-100'],
    ['neutral', 'text-neutral-100'],
    ['danger', 'text-danger'],
    ['outline', 'inset-ring-divider'],
  ])('el tono %s usa %s', (tone, expected) => {
    render(<Badge tone={tone}>Estado</Badge>)

    expect(screen.getByText('Estado')).toHaveClass(expected)
  })

  it('rechaza un tono desconocido con un RangeError en español', () => {
    expect(() => render(<Badge tone={unknownTone() as BadgeTone}>Estado</Badge>)).toThrow(/tono/)
  })
})
