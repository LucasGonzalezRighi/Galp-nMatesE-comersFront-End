import { createFileRoute } from '@tanstack/react-router'
import { AboutContentScreen } from '../../../features/content'

/** Ruta `/contenido/nosotros`: los textos de Nosotros y los socios con su foto. */
export const Route = createFileRoute('/_authenticated/contenido/nosotros')({
  component: AboutContentScreen,
})
