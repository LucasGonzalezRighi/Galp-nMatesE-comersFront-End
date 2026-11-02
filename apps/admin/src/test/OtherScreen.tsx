import type { ReactNode } from 'react'
import { useLocation } from '@tanstack/react-router'

/** Pantalla de las rutas que un test no define: muestra adónde se navegó (ver `renderWithApp`). */
export function OtherScreen(): ReactNode {
  const { pathname } = useLocation()
  return <p>{`Ruta de prueba: ${pathname}`}</p>
}
