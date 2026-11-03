import { createFileRoute } from '@tanstack/react-router'
import { CombosScreen } from '../../features/combos'

/** Ruta `/combos`: los combos del inicio de la tienda, su orden, el alta, la edición y el borrado. */
export const Route = createFileRoute('/_authenticated/combos')({
  component: CombosScreen,
})
