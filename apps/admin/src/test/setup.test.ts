import { describe, expect, it } from 'vitest'

describe('polyfills de jsdom (setup.ts)', () => {
  it('ResizeObserver se puede construir y observar sin hacer nada', () => {
    const observer = new ResizeObserver(() => undefined)

    expect(() => {
      observer.observe(document.body)
      observer.unobserve(document.body)
      observer.disconnect()
    }).not.toThrow()
  })

  it('matchMedia responde que ninguna consulta coincide y admite oyentes', () => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')

    expect(query.matches).toBe(false)
    expect(query.media).toBe('(prefers-reduced-motion: reduce)')
    expect(() => {
      query.addEventListener('change', () => undefined)
      query.removeEventListener('change', () => undefined)
    }).not.toThrow()
  })

  it('PointerEvent conserva el botón y los datos del puntero', () => {
    const event = new PointerEvent('pointerdown', { button: 0, pointerId: 7, pointerType: 'mouse' })

    expect(event).toBeInstanceOf(MouseEvent)
    expect(event.button).toBe(0)
    expect(event.pointerId).toBe(7)
    expect(event.pointerType).toBe('mouse')
  })

  it('los elementos manejan la captura del puntero', () => {
    const element = document.createElement('div')

    expect(element.hasPointerCapture(1)).toBe(false)
    element.setPointerCapture(1)
    expect(element.hasPointerCapture(1)).toBe(true)
    element.releasePointerCapture(1)
    expect(element.hasPointerCapture(1)).toBe(false)
  })

  it('scrollIntoView existe y no hace nada', () => {
    expect(() => {
      document.createElement('div').scrollIntoView()
    }).not.toThrow()
  })

  it('URL.createObjectURL devuelve una URL blob: y revokeObjectURL no falla', () => {
    const url = URL.createObjectURL(new Blob(['x']))

    expect(url).toMatch(/^blob:/)
    expect(() => {
      URL.revokeObjectURL(url)
    }).not.toThrow()
  })

  it('createImageBitmap resuelve un bitmap mínimo con medidas y close', async () => {
    const bitmap = await createImageBitmap(new Blob(['x']))

    expect(bitmap.width).toBeGreaterThan(0)
    expect(bitmap.height).toBeGreaterThan(0)
    expect(() => {
      bitmap.close()
    }).not.toThrow()
  })

  it('el canvas falso devuelve un contexto mínimo y un data URL', () => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    expect(context).not.toBeNull()
    expect(() => {
      context?.drawImage(canvas, 0, 0)
    }).not.toThrow()
    expect(canvas.toDataURL('image/webp', 0.8)).toMatch(/^data:image\//)
  })
})
