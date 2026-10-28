import { createFileRoute } from '@tanstack/react-router'
import { AccountScreen } from '../../features/auth'

/** Ruta `/cuenta`: "Mi cuenta", con el cambio de contraseña. */
export const Route = createFileRoute('/_authenticated/cuenta')({
  component: AccountScreen,
})
