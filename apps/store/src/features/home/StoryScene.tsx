import type { ReactNode } from 'react'
import { Fragment } from 'react'
import { cx } from '../../components/ui/cx'
import { HOME_STAGE_TITLE_SIZE } from './home-styles'
import { SceneReveal } from './SceneReveal'

/** Props de {@link StoryTitle}. */
export interface StoryTitleProps {
  /** Líneas del título; la primera con el color del texto y las demás en cobre. */
  lines: readonly string[]
  /** Fondo de la escena: define el color de las líneas en cobre. */
  tone: 'dark' | 'light'
  /** `lg` (el de casi todas las escenas) o `md`, más chico. */
  size?: 'lg' | 'md'
  /**
   * `true` para poner todas las líneas en un mismo renglón, separadas por un espacio ("Alpaca y
   * bronce.", Ruling AI-4); si no, una debajo de la otra.
   */
  oneLine?: boolean
}

/**
 * Título de una escena: cada renglón sube desde una máscara al entrar en pantalla. Ningún renglón
 * se corta adentro (`whitespace-nowrap`): el tamaño tiene que entrar en la columna.
 *
 * @param props - Ver {@link StoryTitleProps}.
 */
export function StoryTitle({
  lines,
  tone,
  size = 'lg',
  oneLine = false,
}: StoryTitleProps): ReactNode {
  const accent = tone === 'dark' ? 'text-accent-300' : 'text-accent-600'
  return (
    <h2
      className={cx(
        // Las variables las define `.home-stop` en el mate 3D (escalan con el alto); si no, el ancho manda.
        size === 'lg'
          ? cx(HOME_STAGE_TITLE_SIZE, 'leading-[0.92] tracking-[-0.05em]')
          : 'text-[clamp(30px,var(--story-title-md,3.6vw),54px)] leading-[1.02] tracking-[-0.04em]',
        'whitespace-nowrap',
        tone === 'dark' ? 'text-foreground' : 'text-background',
      )}
    >
      {oneLine ? (
        <SceneReveal kind="rise" as="span">
          <span data-title-line="" className="block">
            {lines.map((line, position) => (
              <Fragment key={`${String(position)}-${line}`}>
                {position > 0 ? ' ' : null}
                {position === 0 ? line : <span className={accent}>{line}</span>}
              </Fragment>
            ))}
          </span>
        </SceneReveal>
      ) : (
        lines.map((line, position) => (
          <SceneReveal
            key={`${String(position)}-${line}`}
            kind="rise"
            as="span"
            delay={position * 120}
            contentClassName={position === 0 ? undefined : accent}
          >
            <span data-title-line="" className="block">
              {line}
            </span>
          </SceneReveal>
        ))
      )}
    </h2>
  )
}
