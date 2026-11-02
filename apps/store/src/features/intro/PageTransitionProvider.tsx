'use client'

import type { MouseEvent, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react'
import type { PageTransitionApi } from './intro-context'
import { PAGE_COVERED_ATTRIBUTE } from '../../components/motion/PageEnter'
import { PathnameWatcher } from '../../components/motion/route-watchers'
import { asRoute } from '../../lib/routes'
import { PageTransitionContext } from './intro-context'
import { canSkip, IDLE, INTRO_TIMING, introReducer } from './intro-state'
import { INTRO_COPY } from './intro.copy'
import { IntroLayer } from './IntroLayer'
import { cachedLogoPaths, loadLogoPaths } from './load-logo-paths'
import { CURTAIN_LOGO_IMAGES } from './logo-layout'
import { prefersReducedMotion } from './reduced-motion'

/** Si el clic es uno común (izquierdo, sin teclas), el único que la transición intercepta. */
function isPlainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  )
}

/** Espera antes de precargar el logo del telón si el navegador no avisa cuándo queda libre. */
const WARM_FALLBACK_MS = 2000

/** Precarga las imágenes del logo del telón (quedan en la caché del navegador). */
function warmCurtainLogo(): void {
  for (const src of Object.values(CURTAIN_LOGO_IMAGES)) new Image().src = src
}

/** Props de {@link PageTransitionProvider}. */
export interface PageTransitionProviderProps {
  /** El sitio (encabezado, página, pie): la capa va por encima de todo. */
  children: ReactNode
}

/**
 * Proveedor de la intro del inicio y del telón entre páginas (Ruling MR-29). Se monta una vez en
 * el layout y dibuja la capa ({@link IntroLayer}) por encima del sitio.
 *
 * - **Telón:** un clic en un link del menú (`onNavClick`, desde el encabezado y el menú del
 *   celular) baja el telón con el logo (450 ms), navega con la pantalla tapada (`router.push`) y,
 *   cuando cambia el `pathname`, se abre como un libro (650 ms). Hacia el inicio baja sin logo:
 *   la intro del inicio lo dibuja entero antes de abrirse. Un clic en la página actual, un clic
 *   modificado, con menos movimiento o mientras otra capa se abre navegan como siempre; mientras
 *   el telón baja, un segundo clic se traga (un doble clic no corta la bajada); el botón Atrás no
 *   anima. Mientras hay capa, `<html>` lleva `data-page-covered` y la entrada de página
 *   (`PageEnter`) no se suma: el telón se abre sobre la página nueva ya nítida.
 * - **Intro:** la arranca el inicio al montarse (`startIntro`): espera los trazos, traza el
 *   matecito y GALPÓN (3,4 s), rellena (0,6 s) y se abre (1 s). Un clic, una tecla o la rueda
 *   saltan a la apertura. Mientras dura, los `main` quedan `inert`, un texto para lectores dice
 *   que se está cargando y, al terminar, el foco vuelve adonde estaba.
 *
 * @param props - Ver {@link PageTransitionProviderProps}.
 */
export function PageTransitionProvider({ children }: PageTransitionProviderProps): ReactNode {
  const [state, dispatch] = useReducer(introReducer, IDLE)
  const router = useRouter()
  const routerRef = useRef(router)
  const phaseRef = useRef(state.phase)

  useEffect(() => {
    routerRef.current = router
    phaseRef.current = state.phase
  })

  const api = useMemo<PageTransitionApi>(
    () => ({
      onNavClick: (event, href) => {
        if (!isPlainClick(event) || prefersReducedMotion()) return
        // Con otra capa abriéndose (el telón o la intro) el link navega como siempre; mientras el
        // telón baja (o la intro dibuja) el clic se traga: un doble clic no corta la bajada.
        if (phaseRef.current === 'opening') return
        if (phaseRef.current !== 'idle') {
          event.preventDefault()
          return
        }
        if (window.location.pathname === href) return
        event.preventDefault()
        // Valida la ruta antes de bajar el telón (lanza `RangeError` si no es interna).
        asRoute(href)
        phaseRef.current = 'covering'
        dispatch({ type: 'navigate', href })
      },
      startIntro: () => {
        dispatch({ type: 'introStart', ready: cachedLogoPaths() !== null })
      },
      stopIntro: () => {
        dispatch({ type: 'introStop' })
      },
    }),
    [],
  )

  // El logo del telón, en la caché antes del primer clic en el menú (sin competir con la carga).
  useEffect(() => {
    if (typeof window.requestIdleCallback === 'function') {
      const idle = window.requestIdleCallback(warmCurtainLogo, { timeout: WARM_FALLBACK_MS })
      return () => {
        window.cancelIdleCallback(idle)
      }
    }
    const timer = window.setTimeout(warmCurtainLogo, WARM_FALLBACK_MS)
    return () => {
      window.clearTimeout(timer)
    }
  }, [])

  // Cada paso dura lo suyo; el telón navega cuando terminó de bajar y, si la página nueva no
  // llega, se abre igual al rato.
  useEffect(() => {
    const timers: number[] = []
    const later = (ms: number, run: () => void): void => {
      timers.push(window.setTimeout(run, ms))
    }
    const next = (): void => {
      dispatch({ type: 'next' })
    }
    const { phase, mode, href } = state
    if (phase === 'covering' && href !== null) {
      later(INTRO_TIMING.coverMs, () => {
        routerRef.current.push(asRoute(href))
      })
      later(INTRO_TIMING.coverMs + INTRO_TIMING.routeWaitMs, () => {
        dispatch({ type: 'routeChanged' })
      })
    } else if (phase === 'drawing') later(INTRO_TIMING.drawMs, next)
    else if (phase === 'filling') later(INTRO_TIMING.fillMs, next)
    else if (phase === 'opening') {
      later(mode === 'intro' ? INTRO_TIMING.introOpenMs : INTRO_TIMING.pageOpenMs, next)
    }
    return () => {
      for (const timer of timers) window.clearTimeout(timer)
    }
  }, [state])

  // La primera intro espera los trazos del logo; si no llegan, abre sin logo.
  useEffect(() => {
    if (state.phase !== 'loading') return
    let live = true
    loadLogoPaths().then(
      () => {
        if (live) dispatch({ type: 'ready' })
      },
      () => {
        if (live) dispatch({ type: 'skip' })
      },
    )
    return () => {
      live = false
    }
  }, [state.phase])

  // Clic, tecla o rueda durante la intro: salta a la apertura.
  const skippable = canSkip(state)
  useEffect(() => {
    if (!skippable) return
    const skip = (): void => {
      dispatch({ type: 'skip' })
    }
    window.addEventListener('keydown', skip)
    window.addEventListener('pointerdown', skip)
    window.addEventListener('wheel', skip, { passive: true })
    return () => {
      window.removeEventListener('keydown', skip)
      window.removeEventListener('pointerdown', skip)
      window.removeEventListener('wheel', skip)
    }
  }, [skippable])

  // Con la capa a la vista, la entrada de página (`PageEnter`) no se suma: el telón se abre sobre
  // la página nueva ya nítida.
  const covered = state.phase !== 'idle'
  useLayoutEffect(() => {
    if (!covered) return
    const html = document.documentElement
    html.setAttribute(PAGE_COVERED_ATTRIBUTE, '')
    return () => {
      html.removeAttribute(PAGE_COVERED_ATTRIBUTE)
    }
  }, [covered])

  // Mientras la intro tapa el inicio, el contenido es inerte; al terminar el foco vuelve.
  const blocking = state.mode === 'intro' && state.phase !== 'idle'
  useLayoutEffect(() => {
    if (!blocking) return
    const focused = document.activeElement
    const mains = [...document.querySelectorAll('main')].filter(
      (main) => !main.hasAttribute('inert'),
    )
    for (const main of mains) main.setAttribute('inert', '')
    return () => {
      for (const main of mains) main.removeAttribute('inert')
      const lost = document.activeElement === null || document.activeElement === document.body
      if (
        lost &&
        focused instanceof HTMLElement &&
        focused !== document.body &&
        focused.isConnected
      ) {
        focused.focus({ preventScroll: true })
      }
    }
  }, [blocking])

  const onRouteChange = useCallback(() => {
    dispatch({ type: 'routeChanged' })
  }, [])

  return (
    <PageTransitionContext.Provider value={api}>
      {children}
      {state.phase === 'idle' ? null : (
        <IntroLayer state={state} paths={state.phase === 'loading' ? null : cachedLogoPaths()} />
      )}
      {blocking ? (
        <p role="status" className="sr-only">
          {INTRO_COPY.loading}
        </p>
      ) : null}
      {/* El vigilante lee el pathname: con Cache Components va dentro de un Suspense. */}
      <Suspense fallback={null}>
        <PathnameWatcher onChange={onRouteChange} />
      </Suspense>
    </PageTransitionContext.Provider>
  )
}
