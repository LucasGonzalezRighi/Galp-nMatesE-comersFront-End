import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTestApp } from '../../test/render'
import { ImageUploaderProvider } from './ImageUploaderProvider'
import { createSimulatedUploader } from './simulated-uploader'
import { useImageUploads } from './use-image-uploads'
import { useSingleImageUpload } from './use-single-image-upload'

/** Una foto JPG cualquiera (el `createImageBitmap` falso la hace medir 1000 × 1000). */
function photo(name = 'mate.jpg', type = 'image/jpeg'): File {
  return new File(['foto'], name, { type })
}

/** Espera sin hacer nada (para ver que una subida cancelada no llega a registrarse). */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** API de prueba con sesión y un proveedor con el uploader simulado de `durationMs`. */
async function setup(durationMs = 0) {
  const app = await createTestApp({ demo: false })
  const { registerMockImage } = app.context
  if (registerMockImage === null)
    throw new Error('La app del test tiene que estar en modo de prueba.')
  const uploader = createSimulatedUploader({ api: app.api, registerMockImage, durationMs })
  const onUnauthorized = vi.fn()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ImageUploaderProvider uploader={uploader} onUnauthorized={onUnauthorized}>
      {children}
    </ImageUploaderProvider>
  )
  return { app, wrapper, onUnauthorized }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useImageUploads', () => {
  it('sube cada foto con su vista previa blob: y la deja lista', async () => {
    const { wrapper } = await setup()
    const { result } = renderHook(() => useImageUploads({ purpose: 'product', max: 8 }), {
      wrapper,
    })
    await act(() => result.current.add([photo('a.jpg'), photo('b.png', 'image/png')]))

    expect(result.current.items.map((item) => item.fileName)).toEqual(['a.jpg', 'b.png'])
    for (const item of result.current.items) expect(item.previewUrl).toMatch(/^blob:/)
    await waitFor(() => {
      expect(result.current.items.every((item) => item.status === 'done')).toBe(true)
    })
    expect(result.current.items[0]).toMatchObject({
      progress: 100,
      errorMessage: null,
      result: { url: 'data:image/webp;base64,AAAA', width: 1000, height: 1000 },
    })
    expect(result.current.isUploading).toBe(false)
    expect(result.current.hasErrors).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('respeta el cupo contando las fotos que ya hay', async () => {
    const { wrapper } = await setup()
    const { result } = renderHook(
      () => useImageUploads({ purpose: 'product', max: 3, current: 1 }),
      { wrapper },
    )
    await act(() => result.current.add([photo('a.jpg'), photo('b.jpg'), photo('c.jpg')]))
    expect(result.current.items.map((item) => item.fileName)).toEqual(['a.jpg', 'b.jpg'])
    expect(result.current.error).toBe('Ya hay 3 fotos: quitá una para agregar otra.')

    await act(() => result.current.add([photo('d.jpg')]))
    expect(result.current.items).toHaveLength(2)
    expect(result.current.error).toBe('Ya hay 3 fotos: quitá una para agregar otra.')
  })

  it('no agrega los archivos que no cumplen las reglas y dice por qué', async () => {
    const { wrapper } = await setup()
    const { result } = renderHook(() => useImageUploads({ purpose: 'product', max: 8 }), {
      wrapper,
    })
    await act(() => result.current.add([photo('mate.gif', 'image/gif'), photo('ok.jpg')]))
    expect(result.current.items.map((item) => item.fileName)).toEqual(['ok.jpg'])
    expect(result.current.error).toBe('mate.gif: Formato no admitido: usá JPG, PNG o WebP.')

    await act(() => result.current.add([photo('otra.jpg')]))
    expect(result.current.error).toBeNull()
  })

  it('quitar una foto revoca su blob:', async () => {
    const { wrapper } = await setup()
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    const { result } = renderHook(() => useImageUploads({ purpose: 'product', max: 8 }), {
      wrapper,
    })
    await act(() => result.current.add([photo('a.jpg'), photo('b.jpg')]))
    const [first, second] = result.current.items
    await waitFor(() => {
      expect(result.current.isUploading).toBe(false)
    })

    act(() => {
      result.current.remove(first?.id ?? '')
    })
    expect(revoke).toHaveBeenCalledWith(first?.previewUrl)
    expect(result.current.items.map((item) => item.id)).toEqual([second?.id])
  })

  it('al desmontar revoca todos los blob: y corta las subidas', async () => {
    const { app, wrapper } = await setup(200)
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    const { result, unmount } = renderHook(() => useImageUploads({ purpose: 'product', max: 8 }), {
      wrapper,
    })
    await act(() => result.current.add([photo('a.jpg'), photo('b.jpg')]))
    const previews = result.current.items.map((item) => item.previewUrl)

    unmount()
    expect(revoke.mock.calls.map(([url]) => url)).toEqual(expect.arrayContaining(previews))
    await sleep(400)
    expect(Object.keys(app.mockDb.db.media)).toHaveLength(0)
  })

  it('cancelar corta la subida, quita la foto y revoca su blob:', async () => {
    const { app, wrapper } = await setup(200)
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    const { result } = renderHook(() => useImageUploads({ purpose: 'product', max: 8 }), {
      wrapper,
    })
    await act(() => result.current.add([photo('a.jpg')]))
    const [item] = result.current.items
    expect(result.current.isUploading).toBe(true)
    expect(item).toMatchObject({ status: 'uploading' })

    act(() => {
      result.current.cancel(item?.id ?? '')
    })
    expect(result.current.items).toEqual([])
    expect(result.current.isUploading).toBe(false)
    expect(revoke).toHaveBeenCalledWith(item?.previewUrl)
    await sleep(400)
    expect(Object.keys(app.mockDb.db.media)).toHaveLength(0)
  })

  it('un 401 deja la foto en error con el aviso de sesión y avisa a la estructura', async () => {
    const { app, wrapper, onUnauthorized } = await setup()
    app.mockDb.db.adminSession = null
    const { result } = renderHook(() => useImageUploads({ purpose: 'product', max: 8 }), {
      wrapper,
    })
    await act(() => result.current.add([photo('a.jpg')]))
    await waitFor(() => {
      expect(result.current.items[0]?.status).toBe('error')
    })
    expect(result.current.items[0]?.errorMessage).toBe(
      'Tu sesión venció: ingresá de nuevo y reintentá.',
    )
    expect(result.current.hasErrors).toBe(true)
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('un archivo error-* falla y "Reintentar" lo sube', async () => {
    const { wrapper } = await setup()
    const { result } = renderHook(() => useImageUploads({ purpose: 'product', max: 8 }), {
      wrapper,
    })
    await act(() => result.current.add([photo('error-mate.jpg')]))
    await waitFor(() => {
      expect(result.current.items[0]?.status).toBe('error')
    })
    expect(result.current.items[0]?.errorMessage).toBe(
      'Falló la subida simulada (el archivo empieza con error-). Reintentá.',
    )

    act(() => {
      result.current.retry(result.current.items[0]?.id ?? '')
    })
    expect(result.current.items[0]).toMatchObject({ status: 'uploading', errorMessage: null })
    await waitFor(() => {
      expect(result.current.items[0]?.status).toBe('done')
    })
    expect(result.current.hasErrors).toBe(false)
  })

  it('rechaza un cupo que no es un entero desde 1', async () => {
    const { wrapper } = await setup()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() =>
      renderHook(() => useImageUploads({ purpose: 'product', max: 0 }), { wrapper }),
    ).toThrow(RangeError)
    expect(() =>
      renderHook(() => useImageUploads({ purpose: 'product', max: 2, current: 3 }), { wrapper }),
    ).toThrow(RangeError)
  })
})

describe('useSingleImageUpload', () => {
  it('una foto nueva reemplaza a la anterior y revoca su blob:', async () => {
    const { wrapper } = await setup()
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    const { result } = renderHook(() => useSingleImageUpload({ purpose: 'category' }), {
      wrapper,
    })
    expect(result.current.item).toBeNull()

    await act(() => result.current.add([photo('a.jpg')]))
    await waitFor(() => {
      expect(result.current.item?.status).toBe('done')
    })
    expect(result.current.item?.result?.publicId).toMatch(/^galpon\/lineas\/mock-/)
    const first = result.current.item

    await act(() => result.current.add([photo('b.jpg')]))
    expect(result.current.item?.fileName).toBe('b.jpg')
    expect(revoke).toHaveBeenCalledWith(first?.previewUrl)
    expect(result.current.error).toBeNull()
  })

  it('un archivo inválido no reemplaza la foto que ya está', async () => {
    const { wrapper } = await setup()
    const { result } = renderHook(() => useSingleImageUpload({ purpose: 'partner' }), {
      wrapper,
    })
    await act(() => result.current.add([photo('a.jpg')]))
    await act(() => result.current.add([photo('b.gif', 'image/gif')]))
    expect(result.current.item?.fileName).toBe('a.jpg')
    expect(result.current.error).toBe('b.gif: Formato no admitido: usá JPG, PNG o WebP.')
  })

  it('reintenta y quita sin identificador', async () => {
    const { wrapper } = await setup()
    const { result } = renderHook(() => useSingleImageUpload({ purpose: 'site' }), { wrapper })
    await act(() => result.current.add([photo('error-portada.jpg')]))
    await waitFor(() => {
      expect(result.current.hasErrors).toBe(true)
    })
    act(() => {
      result.current.retry()
    })
    await waitFor(() => {
      expect(result.current.item?.status).toBe('done')
    })
    act(() => {
      result.current.remove()
    })
    expect(result.current.item).toBeNull()
  })
})
