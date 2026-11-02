// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { Shake, type ShakeHandle } from './Shake'
import { cleanUpAfterEach, mockReducedMotion } from './test/support'

cleanUpAfterEach()

describe('Shake', () => {
  it('expone shake() por su ref', () => {
    mockReducedMotion(false)
    const ref = createRef<ShakeHandle>()
    render(
      <Shake ref={ref}>
        <input aria-label="Correo" />
      </Shake>,
    )
    expect(ref.current).not.toBeNull()
    expect(typeof ref.current?.shake).toBe('function')
    expect(screen.getByLabelText('Correo')).toBeVisible()
  })

  it('shake() mueve el contenido de lado a lado', async () => {
    mockReducedMotion(false)
    const ref = createRef<ShakeHandle>()
    render(
      <Shake ref={ref}>
        <input aria-label="Correo" />
      </Shake>,
    )
    const box = screen.getByLabelText('Correo').parentElement
    const initial = box?.style.transform ?? ''
    act(() => {
      ref.current?.shake()
    })
    await waitFor(() => {
      expect(box?.style.transform).not.toBe(initial)
    })
  })

  it('con prefers-reduced-motion shake() no mueve nada ni falla', async () => {
    mockReducedMotion(true)
    const ref = createRef<ShakeHandle>()
    render(
      <Shake ref={ref}>
        <input aria-label="Correo" />
      </Shake>,
    )
    const box = screen.getByLabelText('Correo').parentElement
    const initial = box?.style.transform ?? ''
    act(() => {
      ref.current?.shake()
    })
    await new Promise((resolve) => setTimeout(resolve, 80))
    expect(box?.style.transform ?? '').toBe(initial)
  })
})
