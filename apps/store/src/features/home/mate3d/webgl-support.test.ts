import { describe, expect, it, vi } from 'vitest'
import type { WebGLProbe } from './webgl-support'
import { supportsWebGL } from './webgl-support'

/** Un lienzo de prueba que responde con los contextos indicados y anota si se liberó el contexto. */
function probe(contexts: { webgl2?: boolean; webgl?: boolean }): {
  canvas: WebGLProbe
  getContext: ReturnType<typeof vi.fn>
  loseContext: ReturnType<typeof vi.fn>
} {
  const loseContext = vi.fn()
  const context = { getExtension: vi.fn(() => ({ loseContext })) }
  const getContext = vi.fn((kind: string) =>
    contexts[kind as 'webgl' | 'webgl2'] === true ? context : null,
  )
  return { canvas: { getContext } as unknown as WebGLProbe, getContext, loseContext }
}

describe('supportsWebGL', () => {
  it('con WebGL 2 dice que sí y libera el contexto de prueba', () => {
    const { canvas, getContext, loseContext } = probe({ webgl2: true, webgl: true })
    expect(supportsWebGL(canvas)).toBe(true)
    expect(getContext).toHaveBeenCalledWith('webgl2')
    expect(getContext).not.toHaveBeenCalledWith('webgl')
    expect(loseContext).toHaveBeenCalledTimes(1)
  })

  it('sin WebGL 2 prueba con WebGL 1', () => {
    const { canvas, getContext } = probe({ webgl: true })
    expect(supportsWebGL(canvas)).toBe(true)
    expect(getContext).toHaveBeenLastCalledWith('webgl')
  })

  it('sin ningún contexto dice que no', () => {
    const { canvas, loseContext } = probe({})
    expect(supportsWebGL(canvas)).toBe(false)
    expect(loseContext).not.toHaveBeenCalled()
  })

  it('si el navegador lanza al pedir el contexto (WebGL bloqueado) dice que no', () => {
    const canvas = {
      getContext: () => {
        throw new Error('bloqueado')
      },
    } as unknown as WebGLProbe
    expect(supportsWebGL(canvas)).toBe(false)
  })
})
