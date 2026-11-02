import type { ElementType } from 'react'
import { m } from 'motion/react'

/** Etiquetas HTML que aceptan los componentes de animación que permiten elegir el elemento. */
export type MotionTag = 'div' | 'h1' | 'h2' | 'h3' | 'li' | 'p' | 'section' | 'span'

/** Versión animada (`m`) de cada etiqueta. */
export const MOTION_TAGS: Record<MotionTag, ElementType> = {
  div: m.div,
  h1: m.h1,
  h2: m.h2,
  h3: m.h3,
  li: m.li,
  p: m.p,
  section: m.section,
  span: m.span,
}

/**
 * Etiqueta de un elemento interno que es válido dentro de cada etiqueta externa: `span` dentro de
 * las de texto (que no admiten un `div` adentro) y `div` dentro de las de bloque.
 */
export const INNER_TAGS: Record<MotionTag, 'div' | 'span'> = {
  div: 'div',
  h1: 'span',
  h2: 'span',
  h3: 'span',
  li: 'div',
  p: 'span',
  section: 'div',
  span: 'span',
}
