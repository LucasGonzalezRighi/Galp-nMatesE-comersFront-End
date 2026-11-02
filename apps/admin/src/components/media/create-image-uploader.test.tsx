import type { ReactNode } from 'react'
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTestApp } from '../../test/render'
import { createImageUploader } from './create-image-uploader'
import { FakeXhr, installFakeXhr, nextXhr } from './fake-xhr.test-helper'
import { useImageUploader } from './image-uploader-context'
import { ImageUploaderProvider } from './ImageUploaderProvider'

/** Una foto cualquiera. */
function photo(): File {
  return new File(['foto'], 'mate.jpg', { type: 'image/jpeg' })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createImageUploader', () => {
  it('en modo de prueba simula la subida y guarda un data URL', async () => {
    const app = await createTestApp({ demo: false })
    const uploader = createImageUploader(app.context)
    const result = await uploader.upload(photo(), { purpose: 'site' })
    expect(result.url).toMatch(/^data:image\/webp;base64,/)
    expect(result.publicId).toMatch(/^galpon\/sitio\/mock-/)
  })

  it('en vivo sube a Cloudinary con XMLHttpRequest', async () => {
    installFakeXhr()
    const app = await createTestApp({ demo: false })
    const uploader = createImageUploader({
      ...app.context,
      apiMode: 'live',
      registerMockImage: null,
    })
    const upload = uploader.upload(photo(), { purpose: 'product' })
    const xhr = await nextXhr()
    expect(xhr.url).toBe('https://api.cloudinary.com/v1_1/galpon-mock/image/upload')
    xhr.respond(200, {
      public_id: 'galpon/productos/x',
      secure_url: 'https://res.cloudinary.com/galpon/image/upload/x.jpg',
      width: 900,
      height: 900,
    })
    await expect(upload).resolves.toMatchObject({ publicId: 'galpon/productos/x' })
    expect(FakeXhr.instances).toHaveLength(1)
  })

  it('en modo de prueba sin registerMockImage lanza un RangeError', async () => {
    const app = await createTestApp({ demo: false })
    expect(() => createImageUploader({ ...app.context, registerMockImage: null })).toThrow(
      RangeError,
    )
  })
})

describe('ImageUploaderProvider y useImageUploader', () => {
  it('useImageUploader devuelve el uploader del proveedor', async () => {
    const app = await createTestApp({ demo: false })
    const uploader = createImageUploader(app.context)
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ImageUploaderProvider uploader={uploader}>{children}</ImageUploaderProvider>
    )
    const { result } = renderHook(() => useImageUploader(), { wrapper })
    expect(result.current).toBe(uploader)
  })

  it('sin proveedor lanza un error claro', () => {
    // React escribe el error del render en la consola; acá se espera.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => renderHook(() => useImageUploader())).toThrow(/ImageUploaderProvider/)
    vi.restoreAllMocks()
  })
})
