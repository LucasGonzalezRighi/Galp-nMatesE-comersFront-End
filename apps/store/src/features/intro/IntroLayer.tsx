'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useLayoutEffect, useMemo, useRef } from 'react'
import type { IntroState } from './intro-state'
import type { LogoPart, LogoPaths } from './logo-paths'
import type { StrokeStep } from './stroke-plan'
import { EASE_DRAW } from '../../components/motion/easing'
import { INTRO_TIMING } from './intro-state'
import {
  CUT_SHIFT_PERCENT,
  LOGO_VIEWBOX,
  MARK_BOX,
  MARK_SCALE,
  MARK_X,
  strokeWidthFor,
  WORD_BOX,
  WORD_Y,
} from './logo-layout'
import { planStrokes } from './stroke-plan'
import './intro.css'

/** Prefijo de los `id` del SVG (hay una sola capa a la vez). */
const ID = 'galpon-intro'

/** Cómo se ve el logo: sin logo, trazándose, rellenándose o terminado (relleno y arriba). */
type LogoLook = 'none' | 'draw' | 'fill' | 'done'

/** De dónde sale el relleno: los trazos (la intro) o las imágenes del logo (el telón). */
type LogoSource = 'paths' | 'images'

/** Transformación del matecito dentro del `viewBox`: centrado sobre el corte y escalado. */
const MARK_TRANSFORM = `translate(${String(MARK_X)} 0) scale(${String(MARK_SCALE)})`

/** Transformación de la palabra: debajo del matecito. */
const WORD_TRANSFORM = `translate(0 ${String(WORD_Y)})`

/** Ancho y alto del matecito ya escalado. */
const MARK_W = MARK_BOX.width * MARK_SCALE
const MARK_H = MARK_BOX.height * MARK_SCALE

/** El `viewBox` del logo como texto. */
const VIEWBOX = `${String(LOGO_VIEWBOX.x)} ${String(LOGO_VIEWBOX.y)} ${String(LOGO_VIEWBOX.width)} ${String(LOGO_VIEWBOX.height)}`

/** Cómo se ve el logo en cada paso. */
function logoLook(state: IntroState, source: LogoSource | null): LogoLook {
  if (source === null) return 'none'
  if (state.mode === 'page') return 'done'
  if (state.phase === 'drawing') return 'draw'
  if (state.phase === 'filling') return 'fill'
  return state.phase === 'opening' ? 'done' : 'none'
}

/** De dónde sale el logo: la intro lo dibuja; el telón lo muestra hecho, salvo hacia el inicio. */
function logoSource(state: IntroState, paths: LogoPaths | null): LogoSource | null {
  if (state.mode === 'intro') return paths === null ? null : 'paths'
  return state.href === '/' ? null : 'images'
}

/**
 * Mide cada trazo (`getTotalLength`) y el ancho del logo en pantalla, y los deja en el DOM: el
 * largo de cada guion en `--len` y el grosor (2 px en pantalla) en cada grupo. Recién entonces
 * se muestran los trazos (`data-measured`), así no se ve ni un cuadro de contorno entero.
 */
function measureStrokes(layer: HTMLElement): void {
  const logo = layer.querySelector<SVGSVGElement>('.intro-logo')
  const width = strokeWidthFor(logo?.getBoundingClientRect().width ?? 0)
  for (const group of layer.querySelectorAll<SVGGElement>('[data-stroke-group]')) {
    const scale = group.dataset.strokeGroup === 'mark' ? MARK_SCALE : 1
    group.setAttribute('stroke-width', String(width / scale))
  }
  for (const use of layer.querySelectorAll<SVGUseElement>('.intro-stroke')) {
    const path = layer.querySelector<SVGPathElement>(`#${ID}-${use.dataset.part ?? ''}`)
    const length =
      path !== null && typeof path.getTotalLength === 'function' ? path.getTotalLength() : 0
    // Un poco más largo que el trazo: con el guion corrido entero no queda ni un punto a la vista.
    use.style.setProperty('--len', `${String(Math.ceil(length) + 2)}px`)
  }
  layer.dataset.measured = ''
}

/** Props de {@link IntroLayer}. */
export interface IntroLayerProps {
  /** El estado de la capa (no se dibuja en `idle`). */
  state: IntroState
  /** Los trazos del logo, si ya se cargaron. */
  paths: LogoPaths | null
}

/**
 * La capa que tapa la pantalla (la intro del inicio y el telón entre páginas): dos mitades
 * verticales con fondo liso, cada una con su mitad del logo (el corte cae entre la L y la P).
 * Según el paso, baja desde arriba, traza el matecito y escribe GALPÓN (con `stroke-dashoffset`),
 * rellena el logo con el degradé crema a tostado y lo sube 12 px, y se abre como un libro: cada
 * mitad hacia su costado, con un giro leve y desenfoque. Es decorativa (`aria-hidden`); el
 * movimiento vive en `intro.css` y los tiempos en {@link INTRO_TIMING}.
 *
 * @param props - Ver {@link IntroLayerProps}.
 */
export function IntroLayer({ state, paths }: IntroLayerProps): ReactNode {
  const layerRef = useRef<HTMLDivElement>(null)
  const source = logoSource(state, paths)
  const look = logoLook(state, source)
  const steps = useMemo(() => (paths === null ? [] : planStrokes(paths.mark, paths.word)), [paths])

  useLayoutEffect(() => {
    if (source === 'paths' && layerRef.current !== null) measureStrokes(layerRef.current)
  }, [source, steps])

  const style = {
    '--intro-cut': `${String(CUT_SHIFT_PERCENT)}%`,
    '--intro-ease-draw': `cubic-bezier(${EASE_DRAW.join(', ')})`,
    '--intro-cover-ms': `${String(INTRO_TIMING.coverMs)}ms`,
    '--intro-open-ms': `${String(state.mode === 'intro' ? INTRO_TIMING.introOpenMs : INTRO_TIMING.pageOpenMs)}ms`,
  } as CSSProperties

  return (
    <div
      ref={layerRef}
      data-intro=""
      data-phase={state.phase}
      data-mode={state.mode}
      data-logo={look}
      aria-hidden="true"
      className="intro"
      style={style}
    >
      <svg className="intro-defs" width="0" height="0" focusable="false">
        <defs>
          <linearGradient id={`${ID}-gradient`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" style={{ stopColor: 'var(--color-accent-300)' }} />
            <stop offset="1" style={{ stopColor: 'var(--color-cream)' }} />
          </linearGradient>
          {source === 'paths' && paths !== null ? <PathDefs paths={paths} /> : null}
          {source === 'images' ? <ImageMask /> : null}
        </defs>
      </svg>
      <div className="intro-half intro-half-left">
        <div className="intro-face">
          {source === null ? null : (
            <Logo steps={source === 'paths' ? steps : null} paths={paths} />
          )}
        </div>
      </div>
      <div className="intro-half intro-half-right">
        <div className="intro-face">
          {source === null ? null : (
            <Logo steps={source === 'paths' ? steps : null} paths={paths} />
          )}
        </div>
      </div>
    </div>
  )
}

/** Los trazos (una sola vez, los usan las dos mitades) y la máscara del relleno hecha con ellos. */
function PathDefs({ paths }: { paths: LogoPaths }): ReactNode {
  const fill = (parts: readonly LogoPart[]): ReactNode[] =>
    [...parts]
      .sort((a, b) => Number(a.hole) - Number(b.hole))
      .map((part) => (
        <use key={part.id} href={`#${ID}-${part.id}`} fill={part.hole ? 'black' : 'white'} />
      ))
  return (
    <>
      {[...paths.mark, ...paths.word].map((part) => (
        <path key={part.id} id={`${ID}-${part.id}`} d={part.d} />
      ))}
      <mask
        id={`${ID}-mask`}
        maskUnits="userSpaceOnUse"
        x={LOGO_VIEWBOX.x}
        y={LOGO_VIEWBOX.y}
        width={LOGO_VIEWBOX.width}
        height={LOGO_VIEWBOX.height}
      >
        <g transform={MARK_TRANSFORM}>{fill(paths.mark)}</g>
        <g transform={WORD_TRANSFORM}>{fill(paths.word)}</g>
      </mask>
    </>
  )
}

/** La máscara del relleno con las imágenes del logo, para el telón (no necesita los trazos). */
function ImageMask(): ReactNode {
  return (
    <mask
      id={`${ID}-mask`}
      maskUnits="userSpaceOnUse"
      x={LOGO_VIEWBOX.x}
      y={LOGO_VIEWBOX.y}
      width={LOGO_VIEWBOX.width}
      height={LOGO_VIEWBOX.height}
      style={{ maskType: 'alpha' }}
    >
      <image href="/brand/galpon-mark.svg" x={MARK_X} y="0" width={MARK_W} height={MARK_H} />
      <image
        href="/brand/galpon-wordmark.svg"
        x="0"
        y={WORD_Y}
        width={WORD_BOX.width}
        height={WORD_BOX.height}
      />
    </mask>
  )
}

/** Props de {@link Logo}. */
interface LogoProps {
  /** Los pasos del trazado, o `null` si el logo se muestra hecho (sin trazos). */
  steps: readonly StrokeStep[] | null
  /** Los trazos, para saber qué pasos son del matecito. */
  paths: LogoPaths | null
}

/** Un logo entero (cada mitad tiene el suyo y su recorte deja ver su lado): relleno y trazos. */
function Logo({ steps, paths }: LogoProps): ReactNode {
  const markIds = new Set(paths?.mark.map((part) => part.id))
  const strokes = (inMark: boolean): ReactNode[] =>
    (steps ?? [])
      .filter((step) => markIds.has(step.id) === inMark)
      .map((step) => (
        <use
          key={step.id}
          href={`#${ID}-${step.id}`}
          data-part={step.id}
          className="intro-stroke"
          style={
            {
              '--delay': `${String(step.delayMs)}ms`,
              '--dur': `${String(step.durationMs)}ms`,
            } as CSSProperties
          }
        />
      ))
  return (
    <svg className="intro-logo" viewBox={VIEWBOX} focusable="false">
      <g className="intro-fill" mask={`url(#${ID}-mask)`}>
        <rect x={MARK_X} y="0" width={MARK_W} height={MARK_H} fill={`url(#${ID}-gradient)`} />
        <rect
          x="0"
          y={WORD_Y}
          width={WORD_BOX.width}
          height={WORD_BOX.height}
          fill={`url(#${ID}-gradient)`}
        />
      </g>
      {steps === null ? null : (
        <g className="intro-strokes">
          <g transform={MARK_TRANSFORM} data-stroke-group="mark">
            {strokes(true)}
          </g>
          <g transform={WORD_TRANSFORM} data-stroke-group="word">
            {strokes(false)}
          </g>
        </g>
      )}
    </svg>
  )
}
