import { createFileRoute } from '@tanstack/react-router'
import { SettingsScreen } from '../../features/settings'

/** Ruta `/ajustes`: los ajustes de la tienda (kit, envíos, cuotas, impuestos, vendedor y stock). */
export const Route = createFileRoute('/_authenticated/ajustes')({
  component: SettingsScreen,
})
