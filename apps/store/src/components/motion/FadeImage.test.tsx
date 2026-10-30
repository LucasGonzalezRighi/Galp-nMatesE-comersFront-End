// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import Image from 'next/image'
import { afterEach, describe, expect, it } from 'vitest'
import { FadeImage } from './FadeImage'
import { cleanUpAfterEach, mockReducedMotion } from './test/support'

cleanUpAfterEach()

/** Simula si las imágenes ya terminaron de cargar (jsdom no las descarga). */
function mockImagesComplete(complete: boolean): void {
  Object.defineProperty(HTMLImageElement.prototype, 'complete', {
    configurable: true,
    get: () => complete,
  })
}

afterEach(() => {
  Reflect.deleteProperty(HTMLImageElement.prototype, 'complete')
})

/** El envoltorio del fundido. */
function wrapper(container: HTMLElement): HTMLElement {
  const element = container.querySelector<HTMLElement>('[data-fade-image]')
  if (element === null) throw new Error('Falta el envoltorio de FadeImage.')
  return element
}

describe('FadeImage', () => {
  it('oculta la foto que todavía carga y la funde al terminar (400 ms)', () => {
    mockReducedMotion(false)
    mockImagesComplete(false)
    const { container } = render(
      <FadeImage className="absolute inset-0">
        <Image src="/foto.jpg" alt="Mate" width={40} height={50} />
      </FadeImage>,
    )
    const fade = wrapper(container)
    expect(fade).toHaveClass('absolute', 'inset-0', 'duration-400')
    expect(fade.style.opacity).toBe('0')

    fireEvent.load(container.querySelector('img') ?? document.body)

    expect(fade.style.opacity).toBe('1')
  })

  it('si la foto falla también la muestra (para que se vea el texto alternativo)', () => {
    mockReducedMotion(false)
    mockImagesComplete(false)
    const { container } = render(
      <FadeImage>
        <Image src="/rota.jpg" alt="Mate" width={40} height={50} />
      </FadeImage>,
    )

    fireEvent.error(container.querySelector('img') ?? document.body)

    expect(wrapper(container).style.opacity).toBe('1')
  })

  it('una foto que ya cargó (de la caché) no se oculta', () => {
    mockReducedMotion(false)
    mockImagesComplete(true)
    const { container } = render(
      <FadeImage>
        <Image src="/foto.jpg" alt="Mate" width={40} height={50} />
      </FadeImage>,
    )

    expect(wrapper(container).style.opacity).toBe('')
  })

  it('con menos movimiento no oculta ni funde nada', () => {
    mockReducedMotion(true)
    mockImagesComplete(false)
    const { container } = render(
      <FadeImage>
        <Image src="/foto.jpg" alt="Mate" width={40} height={50} />
      </FadeImage>,
    )

    expect(wrapper(container).style.opacity).toBe('')
  })
})
