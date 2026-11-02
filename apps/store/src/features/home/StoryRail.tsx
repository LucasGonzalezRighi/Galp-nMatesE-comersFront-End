import type { ReactNode } from 'react'
import { cx } from '../../components/ui/cx'
import { HOME_COPY } from './home.copy'

/** Una parada del raíl: su clave y su nombre. */
export interface StoryRailStop {
  /** Clave única de la parada. */
  key: string
  /** Nombre que se muestra al lado del punto. */
  name: string
}

/** Props de {@link StoryRail}. */
export interface StoryRailProps {
  /** Las paradas, en orden. */
  stops: readonly StoryRailStop[]
  /** Posición de la parada actual, desde 0. */
  current: number
  /** Lleva a la parada elegida (ver `scrollToStop` de `ScrollStage`). */
  onSelect: (index: number) => void
}

/**
 * Raíl de paradas del mate 3D, al borde derecho del escenario (siempre sobre los fondos, en
 * claro): un punto por parada y su nombre, que se ve en la actual (desde 1280 px), al pasar el
 * mouse y con el foco. La actual lleva `aria-current="true"` y un punto cobre más grande. Cada ítem es un
 * botón que lleva a su parada. Solo se animan `opacity` y `transform`.
 *
 * @param props - Ver {@link StoryRailProps}.
 */
export function StoryRail({ stops, current, onSelect }: StoryRailProps): ReactNode {
  return (
    <nav
      aria-label={HOME_COPY.railLabel}
      className="absolute top-1/2 right-[clamp(8px,1.4vw,24px)] z-10 -translate-y-1/2 pt-16"
    >
      <ol className="m-0 flex list-none flex-col items-end gap-[2px] p-0">
        {stops.map((stop, index) => {
          const isCurrent = index === current
          return (
            <li key={stop.key}>
              <button
                type="button"
                aria-current={isCurrent ? 'true' : undefined}
                onClick={() => {
                  onSelect(index)
                }}
                className={cx(
                  'group focus-visible:ring-accent flex h-7 cursor-pointer items-center gap-3 rounded-full pr-[10px] pl-3 outline-none focus-visible:ring-2',
                  'ease-main text-foreground transition-transform duration-300 active:scale-[0.98] motion-reduce:transition-none',
                )}
              >
                <span
                  className={cx(
                    'ease-main bg-background/70 rounded-full px-2 py-[2px] text-[12px] font-semibold whitespace-nowrap capitalize transition-[opacity,transform] duration-500 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:transition-none',
                    isCurrent
                      ? 'translate-x-2 opacity-0 xl:translate-x-0 xl:opacity-100'
                      : 'translate-x-2 opacity-0',
                  )}
                >
                  {stop.name}
                </span>
                <span aria-hidden="true" className="relative grid size-2 place-items-center">
                  <span
                    className={cx(
                      'ease-main size-2 rounded-full bg-current transition-opacity duration-300 motion-reduce:transition-none',
                      isCurrent ? 'opacity-0' : 'opacity-40 group-hover:opacity-90',
                    )}
                  />
                  <span
                    className={cx(
                      'bg-accent ease-main absolute size-2 rounded-full transition-[opacity,transform] duration-500 motion-reduce:transition-none',
                      isCurrent ? 'scale-150 opacity-100' : 'scale-50 opacity-0',
                    )}
                  />
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
