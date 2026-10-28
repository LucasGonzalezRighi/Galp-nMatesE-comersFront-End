import { createFileRoute } from '@tanstack/react-router'
import { NewProductScreen } from '../../../features/products'

/** Ruta `/productos/nuevo`: el formulario para crear un producto. */
export const Route = createFileRoute('/_authenticated/productos/nuevo')({
  component: NewProductScreen,
})
