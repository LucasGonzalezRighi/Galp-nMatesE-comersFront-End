import { describe, expect, it } from 'vitest'
import { CATALOG_DEFAULT_COLUMNS, CATALOG_ROWS } from './catalog-rows'

describe('catalog-rows', () => {
  it('la tienda muestra cuatro hileras completas antes del botón', () => {
    expect(CATALOG_ROWS).toBe(4)
  })

  it('antes de medir se suponen 5 columnas (las del contenedor angosto): 20 productos', () => {
    expect(CATALOG_DEFAULT_COLUMNS).toBe(5)
    expect(CATALOG_ROWS * CATALOG_DEFAULT_COLUMNS).toBe(20)
  })
})
