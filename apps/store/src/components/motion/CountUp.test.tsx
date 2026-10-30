// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CountUp, countUpValue, formatCount } from './CountUp'
import {
  cleanUpAfterEach,
  installIntersectionObserver,
  intersectAll,
  mockReducedMotion,
} from './test/support'

cleanUpAfterEach()

describe('formatCount', () => {
  it('usa coma decimal y punto de miles, con los decimales pedidos', () => {
    expect(formatCount(4.8, 1)).toBe('4,8')
    expect(formatCount(1234.5, 1)).toBe('1.234,5')
    expect(formatCount(1800)).toBe('1.800')
    expect(formatCount(0, 1)).toBe('0,0')
    expect(formatCount(1234.5, 2, '$', ' u.')).toBe('$1.234,50 u.')
  })

  it('rechaza valores o decimales inválidos con RangeError', () => {
    expect(() => formatCount(Number.NaN)).toThrow(/value tiene que ser un número finito/)
    expect(() => formatCount(1, 1.5)).toThrow(RangeError)
    expect(() => formatCount(1, 7)).toThrow(/entero de 0 a 6/)
  })
})

describe('countUpValue', () => {
  it('arranca en 0, avanza rápido y termina exactamente en el valor final', () => {
    expect(countUpValue(0, 4.8)).toBe(0)
    expect(countUpValue(0.1, 100)).toBeGreaterThan(40)
    expect(countUpValue(0.99, 4.8)).toBeLessThan(4.8)
    expect(countUpValue(1, 4.8)).toBe(4.8)
    expect(countUpValue(2, 4.8)).toBe(4.8)
    expect(countUpValue(-1, 4.8)).toBe(0)
  })
})

describe('CountUp', () => {
  it('con prefers-reduced-motion muestra el valor final formateado, sin contar', () => {
    mockReducedMotion(true)
    installIntersectionObserver()
    render(<CountUp value={1234.5} decimals={1} />)
    expect(screen.getByText('1.234,5')).toBeVisible()
  })

  it('termina en el valor exacto formateado, con coma decimal', async () => {
    mockReducedMotion(false)
    installIntersectionObserver()
    const { container } = render(<CountUp value={4.8} decimals={1} duration={40} />)
    const visible = container.querySelector('[aria-hidden="true"]')
    expect(visible).toHaveTextContent('4,8')
    act(() => {
      intersectAll()
    })
    // Durante el conteo se ven valores intermedios (de 0,0 en adelante)…
    await waitFor(() => {
      expect(visible).not.toHaveTextContent('4,8')
    })
    // …y al terminar vuelve al valor final exacto.
    await waitFor(() => {
      expect(visible).toHaveTextContent(/^4,8$/)
    })
  })

  it('los lectores de pantalla leen solo el valor final', () => {
    mockReducedMotion(false)
    installIntersectionObserver()
    const { container } = render(<CountUp value={1234} prefix="$" />)
    const texts = [...container.querySelectorAll('span > span')].map((node) => node.textContent)
    expect(texts).toEqual(['$1.234', '$1.234'])
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })

  it('con `start` espera en 0 (una vez hidratado) y cuenta recién cuando `start` pasa a true', async () => {
    mockReducedMotion(false)
    installIntersectionObserver()
    const { container, rerender } = render(<CountUp value={27} start={false} duration={40} />)
    const visible = container.querySelector('[aria-hidden="true"]')
    // Aunque entre en pantalla, no cuenta solo: espera el aviso de quien lo usa.
    act(() => {
      intersectAll()
    })
    expect(visible).toHaveTextContent(/^0$/)
    rerender(<CountUp value={27} start duration={40} />)
    await waitFor(() => {
      expect(visible).toHaveTextContent(/^27$/)
    })
    // Una vez terminado, no vuelve a 0 aunque `start` cambie.
    rerender(<CountUp value={27} start={false} duration={40} />)
    expect(visible).toHaveTextContent(/^27$/)
  })

  it('con prefers-reduced-motion y `start` en false muestra igual el valor final', () => {
    mockReducedMotion(true)
    installIntersectionObserver()
    render(<CountUp value={24} start={false} />)
    expect(screen.getByText('24')).toBeVisible()
  })

  it('rechaza una duración negativa o decimales inválidos', () => {
    expect(() => CountUp({ value: 1, duration: -1 })).toThrow(RangeError)
    expect(() => CountUp({ value: 1, decimals: 9 })).toThrow(RangeError)
  })
})
