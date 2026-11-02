import { createFileRoute } from '@tanstack/react-router'
import { FaqContentScreen } from '../../../features/content'

/** Ruta `/contenido/preguntas`: las preguntas frecuentes por categoría. */
export const Route = createFileRoute('/_authenticated/contenido/preguntas')({
  component: FaqContentScreen,
})
