/**
 * Desenfoque máximo de la capa del lienzo en el pase, en px (Ruling AT-1): 5 px, lo justo para que
 * el mate se vaya "fuera de foco" sin costar cuadros. Si la medición con la GPU real no llega a
 * 58 fps, va en 0 y queda solo el fundido.
 */
export const PASS_BLUR_PX = 5

/** Cómo se ve la capa del lienzo (`[data-stage-canvas]`) para una altura del mate. */
export interface PassLook {
  /** El `filter` de la capa: `none` o `blur(Npx)`, con N redondeado a 0,1 px. */
  filter: string
  /** La opacidad de la capa, de 0 a 1 con dos decimales. */
  opacity: number
}

/** Altura del mate en que empieza el desenfoque (todavía bajo el título de la colección). */
const BLUR_FROM = 0.45

/** Altura del mate en que el desenfoque llega a {@link PASS_BLUR_PX}. */
const BLUR_TO = 1.4

/** Altura del mate en que la capa se empieza a apagar: solo quedan las patas en el borde de arriba. */
const FADE_FROM = 1.35

/** Altura del mate en que la capa ya no se ve. */
const FADE_TO = 1.75

/** Desenfoques más chicos que este (en px) no se dibujan: sin capa de filtro en las paradas. */
const MIN_BLUR_PX = 0.05

/** Curva suave de 0 (en `from` o antes) a 1 (en `to` o después). */
function smoothstep(from: number, to: number, value: number): number {
  const share = Math.min(1, Math.max(0, (value - from) / (to - from)))
  return share * share * (3 - 2 * share)
}

/**
 * Cómo se ve la capa del lienzo mientras el mate se va por arriba en el pase, según la altura a la
 * que ya llegó (la del estado suavizado de la escena, que avisa `onFrame`: así el desenfoque no se
 * adelanta al mate 3D, que llega con atraso). Se desenfoca de 0 a {@link PASS_BLUR_PX} entre las
 * alturas 0,45 y 1,4 (curva suave) y se apaga entre 1,35 y 1,75, un resguardo para lo que asoma en
 * el borde. En las paradas (el mate a −0,1 o más abajo) da `none` y 1; ya apagada, `none`.
 *
 * @param mateY - La altura del mate (`state.mate[1]`), en fracciones de media pantalla (1 es el
 *   borde de arriba).
 * @returns El filtro y la opacidad de la capa ({@link PassLook}).
 * @throws {RangeError} Si `mateY` no es un número finito.
 * @example
 * passLook(-0.1) // { filter: 'none', opacity: 1 }
 * passLook(1.4).filter // 'blur(5px)'
 */
export function passLook(mateY: number): PassLook {
  if (!Number.isFinite(mateY)) {
    throw new RangeError(
      `La altura del mate tiene que ser un número finito; se recibió ${String(mateY)}.`,
    )
  }
  const opacity = Math.round((1 - smoothstep(FADE_FROM, FADE_TO, mateY)) * 100) / 100
  const blur = PASS_BLUR_PX * smoothstep(BLUR_FROM, BLUR_TO, mateY)
  if (opacity === 0 || blur < MIN_BLUR_PX) return { filter: 'none', opacity }
  return { filter: `blur(${String(Math.round(blur * 10) / 10)}px)`, opacity }
}
