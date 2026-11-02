'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from './use-prefers-reduced-motion'

/** Fundido de la foto: 400 ms con la curva principal. */
const FADE_CLASS = 'ease-main transition-opacity duration-400'

/** Props de {@link FadeImage}. */
export interface FadeImageProps {
  /** Clase del envoltorio (por ejemplo `absolute inset-0` para que la foto llene su marco). */
  className?: string
  /** El contenido con la foto (un `<img>`, `next/image` o `ImageWithPlaceholder`). */
  children?: ReactNode
}

/**
 * Hace entrar la foto de adentro con un fundido de 400 ms (`opacity` de 0 a 1, curva principal)
 * cuando termina de cargar, en lugar de aparecer de golpe. Busca el primer `<img>` del contenido:
 * si al montar ya cargó (por ejemplo, desde la caché) o no hay foto, no oculta nada; si falla,
 * la muestra igual (para que se vea el texto alternativo).
 *
 * El HTML del servidor la deja visible: recién en el navegador se oculta la que todavía carga, así
 * sin JavaScript la foto se ve igual. Con `prefers-reduced-motion: reduce` no oculta ni funde.
 *
 * @param props - Ver {@link FadeImageProps}.
 */
export function FadeImage({ className, children }: FadeImageProps): ReactNode {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const wrapper = wrapperRef.current
    const image = wrapper?.querySelector('img')
    if (reduced || wrapper === null || image === null || image === undefined || image.complete) {
      return undefined
    }
    wrapper.style.opacity = '0'
    const show = (): void => {
      wrapper.style.opacity = '1'
    }
    image.addEventListener('load', show)
    image.addEventListener('error', show)
    return () => {
      image.removeEventListener('load', show)
      image.removeEventListener('error', show)
      wrapper.style.removeProperty('opacity')
    }
  }, [reduced])

  return (
    <div
      ref={wrapperRef}
      data-fade-image=""
      className={className === undefined ? FADE_CLASS : `${FADE_CLASS} ${className}`}
    >
      {children}
    </div>
  )
}
