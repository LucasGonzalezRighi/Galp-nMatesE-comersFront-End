'use client'

import type { ReactNode } from 'react'
import { useContext, useEffect, useRef } from 'react'
import { MagneticClaimContext } from '../motion/magnetic-context'
import { usePrefersReducedMotion } from '../motion/use-prefers-reduced-motion'
import { cx } from './cx'

/** Recorrido máximo del imán desde el centro, en píxeles (x, y), y su escala (portafolio). */
const MAGNET_X_PX = 10
const MAGNET_Y_PX = 8
const MAGNET_SCALE = 1.03

/** Transformación del botón en reposo, a la que vuelve al salir el mouse. */
const MAGNET_REST = 'translate3d(0,0,0) scale(1)'

/** Duración de la onda del clic y cuándo se borra (un poco después de terminar), en milisegundos. */
const RIPPLE_MS = 600
const RIPPLE_REMOVE_MS = 650

/** Onda del clic: un círculo blanco radial que crece y se apaga (como en el portafolio). */
const RIPPLE_STYLE =
  'position:absolute;border-radius:50%;pointer-events:none;background:radial-gradient(circle,rgba(255,255,255,.45),transparent 65%);transform:scale(.2);opacity:.9'

/**
 * Capa de los efectos: recorta la banda y las ondas con la forma del botón (sin recortar lo que
 * el botón deja salir, como el contador del carrito) y queda detrás del texto (`-z-10` dentro del
 * `isolate` del botón).
 */
const LAYER_CLASS = 'pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]'

/**
 * Banda del barrido: llena con el color del botón (`--btn-fill`), entra de izquierda a derecha en
 * 1,5 s al pasar el mouse o con el foco del teclado y se recoge en 0,5 s al salir. Con menos
 * movimiento o con el dedo cambia sin transición.
 */
const SWEEP_CLASS =
  'absolute inset-0 bg-(--btn-fill) [clip-path:inset(0_100%_0_0)] transition-[clip-path] duration-500 ease-[ease-out] group-hover/btn:[clip-path:inset(0)] group-hover/btn:duration-1500 group-hover/btn:ease-[cubic-bezier(.4,.05,.25,1)] group-focus-visible/btn:[clip-path:inset(0)] group-focus-visible/btn:duration-1500 group-focus-visible/btn:ease-[cubic-bezier(.4,.05,.25,1)] motion-reduce:transition-none pointer-coarse:transition-none'

/** Recorta un número a ±0,5 (la posición del mouse respecto del centro, en fracción del lado). */
function clampHalf(value: number): number {
  return Math.min(0.5, Math.max(-0.5, value))
}

/**
 * Transformación del imán (la del portafolio): el botón se corre hacia el mouse hasta 5 px en x y
 * 4 px en y, y crece a 1,03.
 *
 * @param dx - Posición horizontal del mouse respecto del centro, en fracción del ancho (−0,5 a 0,5; se recorta).
 * @param dy - Posición vertical del mouse respecto del centro, en fracción del alto (−0,5 a 0,5; se recorta).
 * @returns El valor de `transform`, por ejemplo `translate3d(2.5px,2.0px,0) scale(1.03)`.
 * @throws {RangeError} Si `dx` o `dy` no son finitos.
 */
export function magnetTransform(dx: number, dy: number): string {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
    throw new RangeError(
      `La posición del mouse tiene que ser finita; se recibió ${String(dx)}, ${String(dy)}.`,
    )
  }
  const x = (clampHalf(dx) * MAGNET_X_PX).toFixed(1)
  const y = (clampHalf(dy) * MAGNET_Y_PX).toFixed(1)
  return `translate3d(${x}px,${y}px,0) scale(${String(MAGNET_SCALE)})`
}

/** Dónde va y cuánto mide la onda de un clic, relativo al botón. */
export interface RippleGeometry {
  /** Borde izquierdo del círculo, en píxeles desde el borde izquierdo del botón. */
  left: number
  /** Borde superior del círculo, en píxeles desde el borde superior del botón. */
  top: number
  /** Diámetro del círculo: el doble del lado mayor del botón. */
  size: number
}

/**
 * Calcula la onda de un clic: un círculo del doble del lado mayor del botón, centrado en el punto
 * del clic.
 *
 * @param clientX - Posición horizontal del clic en la ventana.
 * @param clientY - Posición vertical del clic en la ventana.
 * @param box - La caja del botón (`getBoundingClientRect`).
 * @returns Ver {@link RippleGeometry}.
 * @throws {RangeError} Si la posición del clic no es finita.
 */
export function rippleGeometry(
  clientX: number,
  clientY: number,
  box: DOMRectReadOnly,
): RippleGeometry {
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
    throw new RangeError(
      `La posición del clic tiene que ser finita; se recibió ${String(clientX)}, ${String(clientY)}.`,
    )
  }
  const size = Math.max(box.width, box.height) * 2
  return { left: clientX - box.left - size / 2, top: clientY - box.top - size / 2, size }
}

/** Props de {@link ButtonFx}. */
export interface ButtonFxProps {
  /**
   * Con `true` (por omisión) el botón también se corre hacia el mouse (imán) y hace una onda al
   * hacer clic; con `false` solo lleva la banda del barrido (los botones de ícono, como el "+").
   */
  interactive?: boolean
  /** Clase extra de la banda del barrido (por ejemplo, otro disparador del hover). */
  sweepClassName?: string
}

/**
 * Efectos de los botones del portafolio de Lucas (`effects.ts`: `sweepsAuto`, `sweeps`, `ripple` y
 * `magnetic`), como un componente tipado: va adentro del botón (el `Button` de la tienda lo pone
 * solo) y el botón lleva las clases de `buttonFxClassName` (`group/btn`, `isolate`, el color
 * `--btn-fill`, el brillo y el texto blanco).
 *
 * - **Barrido:** una banda llena, decorativa (`aria-hidden`), detrás del texto, que entra de
 *   izquierda a derecha con `clip-path` (CSS puro, también con `focus-visible`).
 * - **Imán:** con el mouse encima el botón se corre hacia él (ver {@link magnetTransform}) y vuelve
 *   al salir; la transición la pone el botón (300 ms, curva principal). Si el botón está dentro de
 *   un `Magnetic`, le avisa (`MagneticClaimContext`) para no sumar dos imanes.
 * - **Onda:** en `pointerdown`, un círculo blanco que crece y se apaga en 600 ms (ver
 *   {@link rippleGeometry}) y se borra.
 *
 * Con `prefers-reduced-motion: reduce` o con el dedo no hay imán ni onda, y el barrido cambia sin
 * transición.
 *
 * @param props - Ver {@link ButtonFxProps}.
 */
export function ButtonFx({ interactive = true, sweepClassName }: ButtonFxProps): ReactNode {
  const layerRef = useRef<HTMLSpanElement>(null)
  const reduced = usePrefersReducedMotion()
  const claimMagnet = useContext(MagneticClaimContext)

  useEffect(() => {
    if (interactive) claimMagnet?.()
  }, [claimMagnet, interactive])

  useEffect(() => {
    const layer = layerRef.current
    const host = layer?.parentElement
    if (!interactive || reduced || layer === null || host === null || host === undefined) {
      return undefined
    }
    const timers = new Set<number>()

    const onPointerMove = (event: PointerEvent): void => {
      if (event.pointerType !== 'mouse') return
      const box = host.getBoundingClientRect()
      if (box.width === 0 || box.height === 0) return
      const dx = (event.clientX - (box.left + box.width / 2)) / box.width
      const dy = (event.clientY - (box.top + box.height / 2)) / box.height
      host.style.transform = magnetTransform(dx, dy)
    }

    const onPointerLeave = (event: PointerEvent): void => {
      if (event.pointerType !== 'mouse') return
      host.style.transform = MAGNET_REST
    }

    const onPointerDown = (event: PointerEvent): void => {
      if (event.pointerType === 'touch') return
      const { left, top, size } = rippleGeometry(
        event.clientX,
        event.clientY,
        host.getBoundingClientRect(),
      )
      const ripple = document.createElement('span')
      ripple.dataset.buttonRipple = ''
      ripple.style.cssText = `${RIPPLE_STYLE};left:${String(left)}px;top:${String(top)}px;width:${String(size)}px;height:${String(size)}px;transition:transform ${String(RIPPLE_MS)}ms var(--ease-main),opacity ${String(RIPPLE_MS)}ms`
      layer.appendChild(ripple)
      requestAnimationFrame(() => {
        ripple.style.transform = 'scale(1)'
        ripple.style.opacity = '0'
      })
      const timer = window.setTimeout(() => {
        ripple.remove()
        timers.delete(timer)
      }, RIPPLE_REMOVE_MS)
      timers.add(timer)
    }

    host.addEventListener('pointermove', onPointerMove)
    host.addEventListener('pointerleave', onPointerLeave)
    host.addEventListener('pointerdown', onPointerDown)
    return () => {
      host.removeEventListener('pointermove', onPointerMove)
      host.removeEventListener('pointerleave', onPointerLeave)
      host.removeEventListener('pointerdown', onPointerDown)
      for (const timer of timers) window.clearTimeout(timer)
      for (const ripple of layer.querySelectorAll('[data-button-ripple]')) ripple.remove()
      host.style.removeProperty('transform')
    }
  }, [interactive, reduced])

  return (
    <span ref={layerRef} aria-hidden="true" data-button-fx="" className={LAYER_CLASS}>
      <span data-button-sweep="" className={cx(SWEEP_CLASS, sweepClassName)} />
    </span>
  )
}
