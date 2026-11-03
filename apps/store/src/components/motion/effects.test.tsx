// @vitest-environment jsdom
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DrawCheck } from './DrawCheck'
import { Float } from './Float'
import { MouseParallax } from './MouseParallax'
import { Ping } from './Ping'
import { cleanUpAfterEach, mockReducedMotion } from './test/support'
import { useScrollTopOnStep } from './use-scroll-top-on-step'

cleanUpAfterEach()

describe('Float, Ping, DrawCheck y MouseParallax', () => {
  it('con movimiento muestran su contenido', () => {
    mockReducedMotion(false)
    render(
      <>
        <Float>Ilustración</Float>
        <MouseParallax>Fondo</MouseParallax>
        <Ping className="ping" />
        <DrawCheck label="Listo" />
      </>,
    )
    expect(screen.getByText('Ilustración')).toBeVisible()
    expect(screen.getByText('Fondo')).toBeVisible()
    expect(screen.getByRole('img', { name: 'Listo' })).toBeVisible()
  })

  it('con prefers-reduced-motion todo queda en su estado final y visible', () => {
    mockReducedMotion(true)
    const { container } = render(
      <>
        <Float>Ilustración</Float>
        <MouseParallax>Fondo</MouseParallax>
        <Ping />
        <DrawCheck />
      </>,
    )
    expect(screen.getByText('Ilustración')).toBeVisible()
    expect(screen.getByText('Fondo')).toBeVisible()
    // El check queda dibujado entero: círculo y tilde sin recorte de trazo.
    const check = container.querySelector('svg')
    expect(check).toHaveAttribute('aria-hidden', 'true')
    expect(check?.querySelector('path')?.getAttribute('stroke-dasharray')).toBeNull()
    expect(check?.querySelector('circle')?.getAttribute('stroke-dasharray')).toBeNull()
  })

  it('el check es decorativo si no tiene etiqueta', () => {
    mockReducedMotion(false)
    const { container } = render(<DrawCheck />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('el parallax solo sigue a un mouse', () => {
    mockReducedMotion(false)
    render(<MouseParallax strength={-30}>Fondo</MouseParallax>)
    const box = screen.getByText('Fondo')
    const before = box.style.transform
    fireEvent.pointerMove(window, { pointerType: 'touch', clientX: 10, clientY: 10 })
    expect(box.style.transform).toBe(before)
  })

  it('validan sus números con RangeError', () => {
    expect(() => Float({ distance: -1 })).toThrow(RangeError)
    expect(() => Float({ duration: Number.NaN })).toThrow(RangeError)
    expect(() => Ping({ size: -1 })).toThrow(RangeError)
    expect(() => DrawCheck({ size: -2 })).toThrow(RangeError)
    expect(() => MouseParallax({ strength: Number.POSITIVE_INFINITY })).toThrow(/finito/)
  })
})

describe('useScrollTopOnStep', () => {
  it('sube suavemente al cambiar el paso y no en el primer render', () => {
    mockReducedMotion(false)
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
    const { rerender } = renderHook(
      ({ step }) => {
        useScrollTopOnStep(step)
      },
      { initialProps: { step: 0 } },
    )
    expect(scrollTo).not.toHaveBeenCalled()
    act(() => {
      rerender({ step: 1 })
    })
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    rerender({ step: 1 })
    expect(scrollTo).toHaveBeenCalledTimes(1)
  })

  it('con prefers-reduced-motion sube de golpe', () => {
    mockReducedMotion(true)
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
    const { rerender } = renderHook(
      ({ step }) => {
        useScrollTopOnStep(step)
      },
      { initialProps: { step: 0 } },
    )
    rerender({ step: 2 })
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
  })

  it('rechaza pasos que no son enteros de 0 en adelante', () => {
    expect(() =>
      renderHook(() => {
        useScrollTopOnStep(-1)
      }),
    ).toThrow(RangeError)
    expect(() =>
      renderHook(() => {
        useScrollTopOnStep(1.5)
      }),
    ).toThrow(/entero/)
  })
})
