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
  /** `true` si es la parada actual: la única que se ve. */
  current: boolean
  /** El contenido de la escena (ver `SceneBody`). */
  children: ReactNode
}

/**
 * Un panel del paseo del mate, a pantalla completa: la columna de texto de 520 px a la izquierda,
 * con el encabezado "01 / 06 · El yerbal" arriba del contenido de la escena; la derecha deja ver
 * el mundo. Los paneles van apilados en el mismo lugar y solo se ve el actual: los demás quedan
 * transparentes, 24 px más abajo y sin recibir el mouse, pero siguen en el DOM y enfocables (cambian
 * en 500 ms con `--ease-main`; con menos movimiento, sin transición). Lleva `data-stage-stop` para
 * que `ScrollStage` traiga la parada cuando el teclado enfoca algo adentro. El texto lleva un halo
 * del color de fondo (en el tono oscuro) que lo separa de las partes claras del mundo sin
 * oscurecer la foto.
 *
 * La clase `home-stop` (en `home.css`) hace que el título, los espacios y las filas de productos
 * escalen también con el alto de la ventana: el panel no tiene scroll interno, así que todo tiene
 * que entrar entre el header y el borde de abajo.
 *
 * @param props - Ver {@link StoryStopProps}.
 * @throws {RangeError} Si `index` o `total` no forman una parada válida.
 */
export function StoryStop({
  index,
  total,
  name,
  tone,
  current,
  children,
}: StoryStopProps): ReactNode {
  const heading = stopHeading(index + 1, total, name)
  return (
    <article
      data-stage-stop={index}
      data-current={current ? 'true' : undefined}
      className={cx(
        'home-stop ease-main absolute inset-0 overflow-hidden transition-[opacity,transform] duration-500 motion-reduce:transition-none',
        current ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0',
        tone === 'light' ? 'text-background' : 'text-foreground',
      )}
    >
      <div className={cx(HOME_CONTAINER, 'relative flex h-full items-center pt-16 pb-6')}>
        <div
          className={cx(
            'flex w-[min(100%,520px)] flex-col gap-[var(--story-gap,24px)]',
            tone === 'dark' &&
              '[text-shadow:0_1px_2px_var(--color-background),0_0_24px_var(--color-background)]',
          )}
        >
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
