/** Punto de la pantalla (en píxeles de la ventana) desde donde sale el vuelo al carrito. */
export interface FlyOrigin {
  /** Distancia al borde izquierdo de la ventana. */
  x: number
  /** Distancia al borde superior de la ventana. */
  y: number
}

/** Duración del vuelo del punto, en milisegundos (la del diseño). */
const FLIGHT_MS = 780

/** Duración del rebote del contador, en milisegundos (la del diseño). */
const BUMP_MS = 520

/** Curva elástica del rebote (`tokens.easing.spring`). */
const SPRING = 'cubic-bezier(.34,1.56,.64,1)'

/** Atributo que marca el botón del carrito del encabezado (`CartButton`): el destino del vuelo. */
const CART_BUTTON_ATTRIBUTE = 'data-cart-button'

/** Atributo que marca el contador del botón del carrito (`CartButton`): lo que rebota. */
const CART_BADGE_ATTRIBUTE = 'data-cart-badge'

/** Si el sistema pidió menos movimiento. */
function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** Si el navegador sabe animar elementos (no es el caso de jsdom). */
function canAnimate(): boolean {
  return typeof Element !== 'undefined' && 'animate' in Element.prototype
}

/**
 * Hace rebotar el contador del botón del carrito (escala 1,5 con el color de acento, 520 ms).
 * No hace nada si el sistema pidió menos movimiento o si no hay botón del carrito en la página.
 */
export function bumpCartBadge(): void {
  if (typeof document === 'undefined' || prefersReducedMotion() || !canAnimate()) return
  const badge = document.querySelector<HTMLElement>(`[${CART_BADGE_ATTRIBUTE}]`)
  if (badge === null) return
  badge.animate(
    [
      { transform: 'scale(1)' },
      {
        transform: 'scale(1.5)',
        background: 'var(--color-accent)',
        color: 'var(--color-background)',
      },
      { transform: 'scale(1)' },
    ],
    { duration: BUMP_MS, easing: SPRING },
  )
}

/**
 * Anima un punto de color desde `origin` (el lugar del clic) hasta el botón del carrito y, al
 * llegar, hace rebotar el contador (`FlyToCart` del diseño). Sin `origin` (por ejemplo, al agregar
 * con el teclado sin un punto claro) solo rebota el contador. Con `prefers-reduced-motion:
 * reduce` no anima nada.
 *
 * @param origin - Punto de salida, en coordenadas de la ventana (`clientX` y `clientY` del clic).
 * @example
 * flyToCart({ x: event.clientX, y: event.clientY })
 */
export function flyToCart(origin?: FlyOrigin): void {
  if (typeof document === 'undefined' || prefersReducedMotion()) return
  const target = document.querySelector<HTMLElement>(`[${CART_BUTTON_ATTRIBUTE}]`)
  if (origin === undefined || target === null || !canAnimate()) {
    bumpCartBadge()
    return
  }
  const box = target.getBoundingClientRect()
  const dx = box.left + box.width / 2 - origin.x
  const dy = box.top + box.height / 2 - origin.y
  const dot = document.createElement('div')
  dot.setAttribute('aria-hidden', 'true')
  Object.assign(dot.style, {
    position: 'fixed',
    left: `${String(origin.x - 7)}px`,
    top: `${String(origin.y - 7)}px`,
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    background: 'var(--color-accent)',
    boxShadow: '0 0 20px 6px color-mix(in srgb, var(--color-accent) 60%, transparent)',
    zIndex: '95',
    pointerEvents: 'none',
  })
  document.body.appendChild(dot)
  const flight = dot.animate(
    [
      { transform: 'translate(0, 0) scale(1)' },
      {
        transform: `translate(${String(dx * 0.45)}px, ${String(dy * 0.45 - 140)}px) scale(1.5)`,
        offset: 0.45,
      },
      { transform: `translate(${String(dx)}px, ${String(dy)}px) scale(0.3)`, opacity: 0.3 },
    ],
    { duration: FLIGHT_MS, easing: 'cubic-bezier(.5,0,.4,1)' },
  )
  const land = (): void => {
    dot.remove()
    bumpCartBadge()
  }
  flight.addEventListener('finish', land, { once: true })
  flight.addEventListener(
    'cancel',
    () => {
      dot.remove()
    },
    { once: true },
  )
}

/** Lo que usa {@link clickOrigin} de un evento de clic. */
interface ClickLike {
  /** Posición horizontal del clic en la ventana. */
  clientX: number
  /** Posición vertical del clic en la ventana. */
  clientY: number
  /** Elemento que escucha el clic. */
  currentTarget: EventTarget
}

/**
 * Punto de salida del vuelo para un clic. Un clic con el teclado llega con la posición (0, 0):
 * en ese caso sale del centro del elemento.
 *
 * @param event - Evento de clic (o de puntero) del botón de agregar.
 * @returns El punto en coordenadas de la ventana, o `undefined` si no se pudo determinar.
 */
export function clickOrigin(event: ClickLike): FlyOrigin | undefined {
  if (event.clientX !== 0 || event.clientY !== 0) return { x: event.clientX, y: event.clientY }
  if (!(event.currentTarget instanceof Element)) return undefined
  const box = event.currentTarget.getBoundingClientRect()
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}
