import { createFileRoute } from '@tanstack/react-router'
import { FooterContentScreen } from '../../../features/content'

/** Ruta `/contenido/pie`: los textos del pie de página. */
export const Route = createFileRoute('/_authenticated/contenido/pie')({
  component: FooterContentScreen,
})
