import { createFileRoute } from '@tanstack/react-router'
import { CategoriesScreen } from '../../features/categories'

/** Ruta `/lineas`: las líneas de productos, su orden en la tienda, el alta, la edición y el borrado. */
export const Route = createFileRoute('/_authenticated/lineas')({
  component: CategoriesScreen,
})
