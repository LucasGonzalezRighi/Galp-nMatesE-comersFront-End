// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ScrubText, wordOpacity } from './ScrubText'
import { cleanUpAfterEach, mockReducedMotion } from './test/support'

cleanUpAfterEach()

describe('wordOpacity', () => {
  it('todas las palabras empiezan atenuadas y terminan completas', () => {
    for (let index = 0; index < 5; index += 1) {
      expect(wordOpacity(0, index, 5)).toBeCloseTo(0.14, 5)
      expect(wordOpacity(1, index, 5)).toBe(1)
    }
  })

  it('se iluminan en orden: a mitad de camino la primera ya está y la última no', () => {
    expect(wordOpacity(0.5, 0, 10)).toBe(1)
    expect(wordOpacity(0.5, 9, 10)).toBeCloseTo(0.14, 5)
    expect(wordOpacity(0.5, 5, 10)).toBeGreaterThan(wordOpacity(0.5, 6, 10))
  })

  it('recorta el avance fuera de 0 a 1 y valida los índices', () => {
    expect(wordOpacity(-3, 0, 3)).toBeCloseTo(0.14, 5)
    expect(wordOpacity(9, 2, 3)).toBe(1)
    expect(() => wordOpacity(0, 0, 0)).toThrow(RangeError)
    expect(() => wordOpacity(0, 3, 3)).toThrow(/entero de 0 a 2/)
  })
})

describe('ScrubText', () => {
  it('con movimiento muestra todas las palabras, atenuadas al principio', () => {
    mockReducedMotion(false)
    render(<ScrubText text="Cada mate  se arma a mano" />)
    const paragraph = screen.getByText('mate').parentElement
    expect(paragraph).toHaveTextContent('Cada mate se arma a mano')
    expect(screen.getByText('Cada').style.opacity).toBe('0.14')
  })

  it('con prefers-reduced-motion se ve completo, sin atenuar', () => {
    mockReducedMotion(true)
    render(<ScrubText text="Cada mate se arma a mano" />)
    const paragraph = screen.getByText('Cada mate se arma a mano')
    expect(paragraph).toBeVisible()
    expect(paragraph.querySelector('[style]')).toBeNull()
  })

  it('exige al menos una palabra', () => {
    expect(() => ScrubText({ text: '   ' })).toThrow(/al menos una palabra/)
  })
})
