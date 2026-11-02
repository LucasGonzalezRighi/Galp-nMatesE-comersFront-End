import { createFileRoute } from '@tanstack/react-router'
import { HomeContentScreen } from '../../../features/content'

/** Ruta `/contenido/inicio`: los textos del inicio y los productos de la historia. */
export const Route = createFileRoute('/_authenticated/contenido/inicio')({
  component: HomeContentScreen,
})
