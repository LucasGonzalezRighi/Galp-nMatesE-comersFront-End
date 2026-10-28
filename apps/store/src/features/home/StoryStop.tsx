import type { ReactNode } from 'react'
import { cx } from '../../components/ui/cx'
import { HOME_CONTAINER } from './home-styles'
import { stopHeading } from './home.copy'

/** Props de {@link StoryStop}. */
export interface StoryStopProps {
  /** Posición de la parada en el paseo, desde 0. */
  index: number
  /** Cantidad de paradas. */
  total: number
  /** Nombre de la parada. */
  name: string
  /** Fondo de la parada: define el color del texto. */
  tone: 'dark' | 'light'
  /** El contenido de la escena (ver `SceneBody`). */
  children: ReactNode
}

/**
 * Un panel del paseo del mate, del ancho de la ventana: la columna de texto de 520 px a la
 * izquierda, con el encabezado "01 / 06 · Las tres piezas" arriba del contenido de la escena. La
 * derecha queda libre para el mate. Lleva `data-stage-stop` para que `ScrollStage` traiga la parada
 * cuando el teclado enfoca algo adentro.
 *
 * @param props - Ver {@link StoryStopProps}.
 * @throws {RangeError} Si `index` o `total` no forman una parada válida.
 */
export function StoryStop({ index, total, name, tone, children }: StoryStopProps): ReactNode {
  const heading = stopHeading(index + 1, total, name)
  return (
    <article
      data-stage-stop={index}
      className={cx(
        'relative h-full w-screen shrink-0 overflow-hidden',
        tone === 'light' ? 'text-background' : 'text-foreground',
      )}
    >
      <div className={cx(HOME_CONTAINER, 'relative flex h-full items-center pt-16 pb-6')}>
        <div className="flex w-[min(100%,520px)] flex-col gap-6">
          <p
            className={cx(
              'm-0 text-[12px] tabular-nums',
              tone === 'light' ? 'text-background/60' : 'text-neutral-400',
            )}
          >
            {heading}
          </p>
          {children}
        </div>
      </div>
    </article>
  )
}
