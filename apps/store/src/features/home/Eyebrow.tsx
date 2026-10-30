import type { ReactNode } from 'react'
import { Reveal } from '../../components/motion'
import { cx } from '../../components/ui/cx'

/**
 * Dónde se apoya el rótulo: sobre el fondo de la tienda, sobre una foto oscurecida (el yerbal del
 * Manifiesto) o sobre una escena oscura o clara de la historia.
 */
export type EyebrowTone = 'section' | 'photo' | 'sceneDark' | 'sceneLight'

/** Props de {@link Eyebrow}. */
export interface EyebrowProps {
  /** Color y separación de letras según dónde se apoya. Por omisión `section`. */
  tone?: EyebrowTone
  /** El texto corto del rótulo. */
  children: ReactNode
}

/** Cuánto tarda en dibujarse la raya, en milisegundos. */
const EYEBROW_LINE_MS = 500

/** Color y separación de cada tono (los del diseño). */
const TONE_CLASSES: Record<EyebrowTone, string> = {
  section: 'text-accent tracking-[0.14em]',
  // El cobre claro: sobre la foto el cobre de siempre no llega a 4,5:1 contra los brillos.
  photo: 'text-accent-300 tracking-[0.14em]',
  sceneDark: 'text-accent-2-300 tracking-[0.16em]',
  sceneLight: 'text-accent-2-700 tracking-[0.16em]',
}

/**
 * Rótulo corto en mayúsculas con una raya adelante, que va arriba de cada título del inicio
 * ("Colección", "Destacados", "El bombillón"). La raya de 32 px se dibuja desde la izquierda al
 * entrar en pantalla (`Reveal` de forma `bar`, 500 ms); con menos movimiento ya está dibujada.
 *
 * @param props - Ver {@link EyebrowProps}.
 */
export function Eyebrow({ tone = 'section', children }: EyebrowProps): ReactNode {
  return (
    <span className={cx('flex items-center gap-3 text-[12px] uppercase', TONE_CLASSES[tone])}>
      <span aria-hidden="true" className="flex">
        <Reveal
          kind="bar"
          as="span"
          duration={EYEBROW_LINE_MS}
          className="block h-px w-7 bg-current"
        />
      </span>
      {children}
    </span>
  )
}
