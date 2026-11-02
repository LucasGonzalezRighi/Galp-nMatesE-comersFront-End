// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { cleanUpAfterEach } from './test/support'
import { useMediaQuery } from './use-media-query'

cleanUpAfterEach()

/** Una lista de medios de mentira que se puede prender y apagar. */
function installMatchMedia(initial: boolean): {
  set: (matches: boolean) => void
  queries: string[]
} {
  let matches = initial
  const listeners = new Set<() => void>()
  const queries: string[] = []
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string): Partial<MediaQueryList> => {
      queries.push(query)
      return {
        get matches() {
          return matches
        },
        media: query,
        addEventListener: (_type: string, listener: () => void) => {
          listeners.add(listener)
        },
        removeEventListener: (_type: string, listener: () => void) => {
          listeners.delete(listener)
        },
      } as Partial<MediaQueryList>
    },
  })
  return {
    queries,
    set: (next) => {
      matches = next
      for (const listener of listeners) listener()
    },
  }
}

/** Componente que escribe el resultado del hook, para dibujarlo en el servidor. */
function Probe(): string {
  return useMediaQuery('(min-width: 1024px)') ? 'ancho' : 'angosto'
}

describe('useMediaQuery', () => {
  it('en el navegador responde a la consulta pedida', () => {
    const media = installMatchMedia(true)
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'))
    expect(result.current).toBe(true)
    expect(media.queries).toContain('(min-width: 1024px)')
  })

  it('se actualiza cuando la consulta deja de cumplirse', () => {
    const media = installMatchMedia(true)
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'))
    act(() => {
      media.set(false)
    })
    expect(result.current).toBe(false)
  })

  it('en el servidor devuelve false', () => {
    installMatchMedia(true)
    expect(renderToString(createElement(Probe))).toBe('angosto')
  })

  it('sin matchMedia devuelve false', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: undefined,
    })
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'))
    expect(result.current).toBe(false)
  })
})
