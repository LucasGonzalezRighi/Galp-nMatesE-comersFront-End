import { describe, expect, it, vi } from 'vitest'
import { metadata } from './global-not-found'

// Solo se mira la metadata: el root layout y la página 404 traen módulos del servidor.
vi.mock('./(tienda)/layout', () => ({ default: () => null }))
vi.mock('./(tienda)/not-found', () => ({ default: () => null }))

describe('global-not-found.tsx', () => {
  it('se titula "Página no encontrada · Galpón Mates" (2.4.2), no solo con el nombre del sitio', () => {
    expect(metadata.title).toEqual({ absolute: 'Página no encontrada · Galpón Mates' })
    expect(metadata.description).toBeTruthy()
  })
})
