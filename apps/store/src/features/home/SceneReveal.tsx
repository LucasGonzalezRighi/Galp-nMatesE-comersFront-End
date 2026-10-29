'use client'

import type { CSSProperties, ReactNode } from 'react'
import { createContext, use } from 'react'
import type { RevealProps } from '../../components/motion'
import { Reveal } from '../../components/motion'

/**
 * `true` dentro de un panel del mate 3D que no es el primero: los tres paneles están
 * apilados en la ventana, así que sus `Reveal` dispararían todos juntos al entrar el escenario,
 * transparentes. Ahí el contenido se dibuja ya en su estado final y la entrada escalonada la hace
 * el panel al volverse el actual (`StoryStop`). Fuera del mate 3D vale `false`.
 */
export const StaticRevealContext = createContext(false)

/** Máscara de la forma `rise`, la misma que pone `Reveal`. */
const MASK_STYLE: CSSProperties = { display: 'block', overflow: 'hidden', paddingBottom: '.1em' }

/** El elemento interno de las formas de dos capas ocupa todo el ancho del externo. */
const BLOCK_STYLE: CSSProperties = { display: 'block' }

/** Props de {@link SceneReveal}: las de `Reveal` que usa la historia del inicio. */
export type SceneRevealProps = Pick<
  RevealProps,
  'kind' | 'delay' | 'as' | 'className' | 'contentClassName' | 'children'
>

/**
 * El `Reveal` de la historia del inicio: aparece al entrar en pantalla como siempre, salvo dentro
 * de un panel del mate 3D con {@link StaticRevealContext}, donde se dibuja con la misma estructura ya
 * en su estado final (sin estilos en línea que lo escondan).
 *
 * @param props - Ver {@link SceneRevealProps}.
 */
export function SceneReveal(props: SceneRevealProps): ReactNode {
  const isStatic = use(StaticRevealContext)
  if (!isStatic) return <Reveal {...props} />
  const { kind = 'up', as: Outer = 'div', className, contentClassName, children } = props
  if (kind !== 'rise' && kind !== 'clip') return <Outer className={className}>{children}</Outer>
  const Inner = Outer === 'div' || Outer === 'li' || Outer === 'section' ? 'div' : 'span'
  return (
    <Outer className={className} style={kind === 'rise' ? MASK_STYLE : undefined}>
      <Inner className={contentClassName} style={BLOCK_STYLE}>
        {children}
      </Inner>
    </Outer>
  )
}
