import { describe, expect, it } from 'vitest'
import { faqCategoryFromHash } from './faq-hash'

const CATEGORIES = [{ id: 'envios' }, { id: 'pagos' }, { id: 'cambios' }]

describe('faqCategoryFromHash', () => {
  it('encuentra la categoría con o sin el "#"', () => {
    expect(faqCategoryFromHash('#cambios', CATEGORIES)).toBe('cambios')
    expect(faqCategoryFromHash('pagos', CATEGORIES)).toBe('pagos')
  })

  it('devuelve null si el ancla está vacía o no es de ninguna categoría', () => {
    expect(faqCategoryFromHash('', CATEGORIES)).toBeNull()
    expect(faqCategoryFromHash('#', CATEGORIES)).toBeNull()
    expect(faqCategoryFromHash('#otra', CATEGORIES)).toBeNull()
  })

  it('devuelve null, sin lanzar, si el ancla está mal codificada', () => {
    expect(faqCategoryFromHash('#%', CATEGORIES)).toBeNull()
    expect(faqCategoryFromHash('#%E0%A4%A', CATEGORIES)).toBeNull()
  })

  it('decodifica el ancla antes de compararla', () => {
    expect(faqCategoryFromHash('#env%69os', CATEGORIES)).toBe('envios')
  })
})
