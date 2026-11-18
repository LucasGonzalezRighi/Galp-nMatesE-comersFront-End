/**
 * Paso de la capa que tapa la pantalla:
 * - `idle`: no hay capa.
 * - `covering`: el telón baja y queda tapado hasta que pasó el mínimo y pintó la página nueva.
 * - `covered`: el telón ya está abajo sin haber bajado (el inicio se mostró sin el telón del
 *   menú: el botón Atrás o un link del contenido); espera lo mismo que `covering`.
 * - `loading`: la intro espera los trazos del logo (pantalla lisa).
 * - `drawing`: la intro traza el matecito y escribe GALPÓN.
 * - `filling`: el logo se rellena con el degradé y sube un poco.
 * - `opening`: las dos mitades se abren como un libro hacia los costados.
 */
export type IntroPhase =
  'idle' | 'covering' | 'covered' | 'loading' | 'drawing' | 'filling' | 'opening'

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
  /** Telón: la página nueva ya se pintó debajo. */
  routed: boolean
  /** Telón: ya pasó el mínimo tapado ({@link INTRO_TIMING} `pageHoldMs`). */
  held: boolean
}

/** Lo que le pasa a la capa. */
export type IntroAction =
  /** Un clic en un link del menú: baja el telón hacia `href`. */
  | { type: 'navigate'; href: string }
  /**
   * El inicio se mostró. Con `first` (es la primera página que cargó el navegador) arranca la
   * intro: si los trazos ya están (`ready`), directo a dibujar. Si no, sigue el telón que viene
   * bajando o, si no hay, aparece ya abajo.
   */
  | { type: 'introStart'; ready: boolean; first: boolean }
  /** El inicio se desmontó o se ocultó. */
  | { type: 'introStop' }
  /** Llegaron los trazos del logo. */
  | { type: 'ready' }
  /** Cambió la ruta (ya se pintó la página nueva). */
  | { type: 'routeChanged' }
  /** Clic, tecla o rueda durante la intro: salta a abrir. */
  | { type: 'skip' }
  /** Terminó el paso actual o, en el telón, el mínimo tapado (lo avisa un temporizador). */
  | { type: 'next' }

/** Sin capa. */
export const IDLE: IntroState = {
  phase: 'idle',
  mode: 'page',
  href: null,
  routed: false,
  held: false,
}

/** Duraciones de la capa, en milisegundos (Rulings AI-1 y AI-2). */
export const INTRO_TIMING = {
  /** Trazado: el matecito de 0 a 1,2 s y GALPÓN de 0 a 2,4 s (`STROKE_TIMING`). */
  drawMs: 2400,
  /** Relleno con el degradé y subida: 2,4 a 2,9 s. */
  fillMs: 500,
  /** Apertura de la intro: 2,9 a 4,4 s (Ruling MR-31: 1,5 s, suave al arrancar y al llegar). */
  introOpenMs: 1500,
  /** Bajada del telón entre páginas. */
  coverMs: 450,
  /**
   * El telón queda tapado, con el logo, al menos hasta acá desde el clic (baja en 450 ms y se
   * queda 400 ms): con la página nueva lista, se abre aquí y termina a los 1,5 s.
   */
  pageHoldMs: 850,
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

/** Si el telón está abajo (bajando o ya bajado) esperando para abrirse. */
function isCurtainWaiting(state: IntroState): boolean {
  return state.mode === 'page' && (state.phase === 'covering' || state.phase === 'covered')
}

/**
 * Avanza la capa con una acción. Un clic en el menú solo baja el telón si no hay otra capa. El
 * telón se abre cuando pasaron las dos cosas, en cualquier orden: el mínimo tapado y el cambio de
 * ruta. La intro dibujada arranca solo si el inicio es la primera página que cargó el navegador
 * (también sobre un telón); si no, el inicio deja seguir el telón o lo muestra ya abajo.
 *
 * @param state - El estado actual.
 * @param action - Lo que pasó.
 * @returns El estado siguiente (el mismo objeto si la acción no cambia nada).
 */
export function introReducer(state: IntroState, action: IntroAction): IntroState {
  switch (action.type) {
    case 'navigate':
      return state.phase === 'idle' ? { ...IDLE, phase: 'covering', href: action.href } : state
    case 'introStart':
      if (action.first) {
        return { ...IDLE, phase: action.ready ? 'drawing' : 'loading', mode: 'intro' }
      }
      return state.phase === 'idle' ? { ...IDLE, phase: 'covered', routed: true } : state
    case 'introStop':
      return state.mode === 'intro' && state.phase !== 'opening' ? IDLE : state
    case 'ready':
      return state.mode === 'intro' && state.phase === 'loading'
        ? { ...state, phase: 'drawing' }
        : state
    case 'routeChanged':
      if (!isCurtainWaiting(state)) return state
      return state.held ? { ...state, phase: 'opening' } : { ...state, routed: true }
    case 'skip':
      return canSkip(state) ? { ...state, phase: 'opening' } : state
    case 'next':
      return advance(state)
  }
}

/** El paso que sigue cuando termina el tiempo del actual (en el telón, el mínimo tapado). */
function advance(state: IntroState): IntroState {
  if (isCurtainWaiting(state)) {
    return state.routed ? { ...state, phase: 'opening' } : { ...state, held: true }
  }
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
