import type { ReactNode } from 'react'
import { Reveal } from '../../components/motion'
import { cx } from '../../components/ui/cx'
import { HOME_CONTAINER } from './home-styles'

/** Fondo decorativo de una escena oscura. */
export type SceneBackground = 'hero' | 'gourd' | 'bombilla'

/** Props de {@link StoryScene}. */
export interface StorySceneProps {
  /** `dark` (fondo de la tienda) o `light` (fondo crema, con el texto oscuro). */
  tone: 'dark' | 'light'
  /** De qué lado va el texto: `start` a la izquierda, `end` a la derecha. */
  side: 'start' | 'end'
  /** Resplandor de fondo de las escenas oscuras. */
  background?: SceneBackground
  /** Palabra gigante de contorno al fondo (escena del bombillón). */
  ghostWord?: string
  /** Foto que flota al otro lado del texto (ver `StoryVisual`). */
  visual?: ReactNode
  /** El texto de la escena. */
  children: ReactNode
}

/** Clase del resplandor de fondo de cada escena oscura (también la usan las paradas del paseo del mate). */
export const SCENE_BACKGROUND_CLASSES: Record<SceneBackground, string> = {
  hero: 'home-bg-hero',
  gourd: 'home-bg-gourd',
  bombilla: 'home-bg-bombilla',
}

/**
 * Marco de una escena de la historia del inicio: sección de al menos 115 % de la altura de la
 * ventana, con el fondo oscuro o claro, la foto de un lado y el texto (520 px) del otro.
 *
 * @param props - Ver {@link StorySceneProps}.
 */
export function StoryScene({
  tone,
  side,
  background,
  ghostWord,
  visual,
  children,
}: StorySceneProps): ReactNode {
  return (
    <section
      className={cx(
        'home-scene relative flex items-center overflow-hidden',
        tone === 'light' && 'home-bg-light text-background',
      )}
    >
      {background === undefined ? null : (
        <div
          aria-hidden="true"
          className={cx(
            'pointer-events-none absolute inset-0',
            SCENE_BACKGROUND_CLASSES[background],
          )}
        />
      )}
      {ghostWord === undefined ? null : (
        <span aria-hidden="true" className="home-ghost">
          {ghostWord}
        </span>
      )}
      {visual}
      <div
        className={cx(
          HOME_CONTAINER,
          'relative flex py-[72px]',
          side === 'start' ? 'justify-start' : 'justify-end',
        )}
      >
        <div className="flex w-[min(100%,520px)] flex-col gap-6">{children}</div>
      </div>
    </section>
  )
}

/** Props de {@link StoryTitle}. */
export interface StoryTitleProps {
  /** Líneas del título, una debajo de la otra; la primera con el color del texto y las demás en cobre. */
  lines: readonly string[]
  /** Fondo de la escena: define el color de las líneas en cobre. */
  tone: 'dark' | 'light'
  /** `lg` (el de casi todas las escenas) o `md`, más chico y sin cortes de línea. */
  size?: 'lg' | 'md'
}

/**
 * Título de una escena: cada línea sube desde una máscara al entrar en pantalla.
 *
 * @param props - Ver {@link StoryTitleProps}.
 */
export function StoryTitle({ lines, tone, size = 'lg' }: StoryTitleProps): ReactNode {
  const accent = tone === 'dark' ? 'text-accent-300' : 'text-accent-600'
  return (
    <h2
      className={cx(
        // Las variables las define `.home-stop` en el paseo (escalan con el alto); si no, el ancho manda.
        size === 'lg'
          ? 'text-[clamp(44px,var(--story-title-lg,6.4vw),104px)] leading-[0.92] tracking-[-0.05em]'
          : 'text-[clamp(30px,var(--story-title-md,3.6vw),54px)] leading-[1.02] tracking-[-0.04em] whitespace-nowrap',
        tone === 'dark' ? 'text-foreground' : 'text-background',
      )}
    >
      {lines.map((line, position) => (
        <Reveal
          key={`${String(position)}-${line}`}
          kind="rise"
          as="span"
          delay={position * 120}
          contentClassName={position === 0 ? undefined : accent}
        >
          {line}
        </Reveal>
      ))}
    </h2>
  )
}
