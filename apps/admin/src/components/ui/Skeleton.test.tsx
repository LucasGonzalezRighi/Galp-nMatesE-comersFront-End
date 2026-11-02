import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Skeleton } from './Skeleton'

describe('Skeleton', () => {
  it('es un bloque decorativo neutral-900 que late, sin pulso con motion-reduce', () => {
    const { container } = render(<Skeleton className="h-4 w-32" />)

    const block = container.firstElementChild
    expect(block).toHaveAttribute('aria-hidden', 'true')
    expect(block).toHaveClass(
      'bg-neutral-900',
      'animate-pulse',
      'motion-reduce:animate-none',
      'h-4',
      'w-32',
    )
  })
})
