import { describe, expect, it } from 'vitest'
import { REVIEWS_TAB_STATUS, reviewsSearchSchema } from './reviews-search'

describe('reviewsSearchSchema', () => {
  it('por omisión muestra la primera página de pendientes', () => {
    expect(reviewsSearchSchema.parse({})).toEqual({ estado: 'pendientes', pagina: 1 })
  })

  it('acepta cada pestaña y la página como número o texto', () => {
    expect(reviewsSearchSchema.parse({ estado: 'ocultas', pagina: '3' })).toEqual({
      estado: 'ocultas',
      pagina: 3,
    })
  })

  it('descarta valores que no sirven', () => {
    expect(reviewsSearchSchema.parse({ estado: 'borradas', pagina: 0 })).toEqual({
      estado: 'pendientes',
      pagina: 1,
    })
    expect(reviewsSearchSchema.parse({ pagina: 1.5 })).toEqual({ estado: 'pendientes', pagina: 1 })
  })

  it('cada pestaña corresponde a un estado de la API', () => {
    expect(REVIEWS_TAB_STATUS).toEqual({
      pendientes: 'pending',
      aprobadas: 'approved',
      ocultas: 'hidden',
    })
  })
})
