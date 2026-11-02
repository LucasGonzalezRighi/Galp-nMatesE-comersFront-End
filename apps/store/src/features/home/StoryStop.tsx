import type { ReactNode } from 'react'
import { cx } from '../../components/ui/cx'
import { HOME_CONTAINER } from './home-styles'
import { stopHeading } from './home.copy'
import { StaticRevealContext } from './SceneReveal'

/** Props de {@link StoryStop}. */
export interface StoryStopProps {
  /** Posición de la parada en el mate 3D, desde 0. */
  index: number
  /** Cantidad de paradas. */
  total: number
  /** Nombre de la parada. */
  name: string
  /** `true` si es la parada actual: la única que se ve. */
  current: boolean
  /** El contenido de la escena (ver `SceneBody`). */
  children: ReactNode
}

/**
 * Un panel del mate 3D, a pantalla completa: la columna de texto de 520 px a la izquierda; la
 * derecha deja ver el mate. El encabezado "02 / 03 · La bombilla" no se ve (Ruling MR-23): queda
 * solo como nombre accesible del panel (`aria-label`). Los paneles
 * van apilados en el mismo lugar y solo se ve el actual: los demás quedan transparentes y sin
 * recibir el mouse, pero siguen en el DOM y enfocables (cambian en 500 ms con `--ease-main`; con
 * menos movimiento, sin transición). Lleva `data-stage-stop` para que `ScrollStage` traiga la
 * parada cuando el teclado enfoca algo adentro, y el panel mismo es enfocable (con su encabezado
 * como nombre): así Tab llega también a una parada sin botones, como la del agua; con el foco del
 * teclado, el panel lleva un contorno cobre por dentro. El texto va en claro, con un halo del color de fondo
 * que lo separa de los fondos.
 *
 * Entrada escalonada: al volverse el actual, cada pieza de la columna sube y aparece con un
 * retardo de 60 ms más que la anterior (`.home-stop-column` en `home.css`). Por eso el contenido
 * se dibuja con `StaticRevealContext`: sus `Reveal` dispararían todos juntos al entrar el
 * escenario, y el primer panel ya entró con la portada del servidor antes de que el escenario se
 * monte (el panel actual desde el principio no transiciona).
 *
 * La clase `home-stop` (en `home.css`) hace que el título, los espacios y las filas de productos
 * escalen también con el alto de la ventana: el panel no tiene scroll interno, así que todo tiene
 * que entrar entre el header y el borde de abajo.
 *
 * @param props - Ver {@link StoryStopProps}.
 * @throws {RangeError} Si `index` o `total` no forman una parada válida.
 */
export function StoryStop({ index, total, name, current, children }: StoryStopProps): ReactNode {
  const heading = stopHeading(index + 1, total, name)
  return (
    <article
      data-stage-stop={index}
      data-current={current ? 'true' : undefined}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Tab tiene que llegar a cada parada aunque no tenga botones (la del agua): el foco trae la parada vía `ScrollStage`
      tabIndex={0}
      aria-label={heading}
      className={cx(
        'home-stop ease-main text-foreground focus-visible:outline-accent absolute inset-0 overflow-hidden transition-opacity duration-500 outline-none focus-visible:outline-2 focus-visible:-outline-offset-8 focus-visible:outline-solid motion-reduce:transition-none',
        current ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <div className={cx(HOME_CONTAINER, 'relative flex h-full items-center pt-16 pb-6')}>
        <div className="home-stop-column flex w-[min(100%,520px)] flex-col gap-[var(--story-gap,24px)] [text-shadow:0_1px_2px_var(--color-background),0_0_24px_var(--color-background)]">
          <StaticRevealContext value>{children}</StaticRevealContext>
        </div>
      </div>
    </article>
  )
}
