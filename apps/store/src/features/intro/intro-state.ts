/**
 * Paso de la capa que tapa la pantalla:
 * - `idle`: no hay capa.
 * - `covering`: el telón baja (o ya bajó y espera que pinte la página nueva).
 * - `loading`: la intro espera los trazos del logo (pantalla lisa).
 * - `drawing`: la intro traza el matecito y escribe GALPÓN.
 * - `filling`: el logo se rellena con el degradé y sube un poco.
 * - `opening`: las dos mitades se abren como un libro hacia los costados.
 */
export type IntroPhase = 'idle' | 'covering' | 'loading' | 'drawing' | 'filling' | 'opening'

/** Qué está tapando la pantalla: la intro del inicio o el telón entre páginas. */
export type IntroMode = 'intro' | 'page'

/** Estado de la capa. */
export interface IntroState {
  /** El paso actual. */
  phase: IntroPhase
  /** Intro o telón. */
  mode: IntroMode
  /** Adónde navegar cuando el telón termina de bajar, o `null`. */
  href: string | null
}

/** Lo que le pasa a la capa. */
export type IntroAction =
  /** Un clic en un link del menú: baja el telón hacia `href`. */
  | { type: 'navigate'; href: string }
  /** El inicio se montó: arranca la intro (si los trazos ya están, directo a dibujar). */
  | { type: 'introStart'; ready: boolean }
  /** El inicio se desmontó o se ocultó. */
  | { type: 'introStop' }
  /** Llegaron los trazos del logo. */
  | { type: 'ready' }
  /** Cambió la ruta (ya se pintó la página nueva). */
  | { type: 'routeChanged' }
  /** Clic, tecla o rueda durante la intro: salta a abrir. */
  | { type: 'skip' }
  /** Terminó el paso actual (lo avisa un temporizador). */
  | { type: 'next' }

/** Sin capa. */
export const IDLE: IntroState = { phase: 'idle', mode: 'page', href: null }

/** Duraciones de la capa, en milisegundos (el guion del video de 5 s, con la apertura más larga). */
export const INTRO_TIMING = {
  /** Trazado del matecito y de la palabra: 0 a 3,4 s. */
  drawMs: 3400,
  /** Relleno con el degradé y subida: 3,4 a 4 s. */
  fillMs: 600,
  /** Apertura de la intro: 4 a 5,5 s (Ruling MR-31: 1,5 s, suave al arrancar y al llegar). */
  introOpenMs: 1500,
  /** Bajada del telón entre páginas. */
  coverMs: 450,
  /** Apertura del telón entre páginas. */
  pageOpenMs: 650,
  /** Si la página nueva no llega en este tiempo después de bajar el telón, se abre igual. */
  routeWaitMs: 8000,
} as const

/** Pasos de la intro que se pueden saltar. */
const SKIPPABLE: ReadonlySet<IntroPhase> = new Set(['loading', 'drawing', 'filling'])

/**
 * Indica si un paso de la intro se puede saltar con un clic, una tecla o la rueda.
 *
 * @param state - El estado de la capa.
 * @returns `true` durante la carga, el trazado y el relleno de la intro.
 */
export function canSkip(state: IntroState): boolean {
  return state.mode === 'intro' && SKIPPABLE.has(state.phase)
}

/**
 * Avanza la capa con una acción. Un clic en el menú solo baja el telón si no hay otra capa; el
 * cambio de ruta solo abre el telón que está tapando (si en el medio arrancó la intro del inicio,
 * manda la intro); la intro arranca siempre, también sobre un telón que está tapando.
 *
 * @param state - El estado actual.
 * @param action - Lo que pasó.
 * @returns El estado siguiente (el mismo objeto si la acción no cambia nada).
 */
export function introReducer(state: IntroState, action: IntroAction): IntroState {
  switch (action.type) {
    case 'navigate':
      return state.phase === 'idle' ? { phase: 'covering', mode: 'page', href: action.href } : state
    case 'introStart':
      return { phase: action.ready ? 'drawing' : 'loading', mode: 'intro', href: null }
    case 'introStop':
      return state.mode === 'intro' && state.phase !== 'opening' ? IDLE : state
    case 'ready':
      return state.mode === 'intro' && state.phase === 'loading'
        ? { ...state, phase: 'drawing' }
        : state
    case 'routeChanged':
      return state.mode === 'page' && state.phase === 'covering'
        ? { ...state, phase: 'opening' }
        : state
    case 'skip':
      return canSkip(state) ? { ...state, phase: 'opening' } : state
    case 'next':
      return advance(state)
  }
}

/** El paso que sigue cuando termina el tiempo del actual. */
function advance(state: IntroState): IntroState {
  switch (state.phase) {
    case 'drawing':
      return { ...state, phase: 'filling' }
    case 'filling':
      return { ...state, phase: 'opening' }
    case 'opening':
      return IDLE
    default:
      return state
  }
}
