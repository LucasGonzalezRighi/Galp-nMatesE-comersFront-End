'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'

/** Degradé de la barra (el del diseño): transparente a la izquierda y claro a la derecha. */
const BAR_BACKGROUND =
  'linear-gradient(90deg, transparent, var(--color-accent) 70%, var(--color-accent-200))'

/**
 * Barra fina de 2 px arriba de todo que muestra cuánto se leyó de la página (todo el sitio). Se
 * actualiza con `transform: scaleX` en cada cuadro del scroll, sin volver a dibujar React. Es
 * decorativa: no capta clics ni se anuncia.
 */
export function ScrollProgress(): ReactNode {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let frame = 0
    const update = (): void => {
      frame = 0
      const bar = barRef.current
      if (bar === null) return
      const max = document.documentElement.scrollHeight - window.innerHeight
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      bar.style.transform = `scaleX(${progress.toFixed(4)})`
    }
    const schedule = (): void => {
      if (frame === 0) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-60 h-[2px]">
      <div
        ref={barRef}
        className="h-full origin-left"
        style={{ transform: 'scaleX(0)', background: BAR_BACKGROUND }}
      />
    </div>
  )
}
