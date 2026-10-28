import { createFileRoute } from '@tanstack/react-router'
import { ProductTabsContentScreen } from '../../../features/content'

/** Ruta `/contenido/pestanas`: los textos de las pestañas de la ficha de cada grupo. */
export const Route = createFileRoute('/_authenticated/contenido/pestanas')({
  component: ProductTabsContentScreen,
})
