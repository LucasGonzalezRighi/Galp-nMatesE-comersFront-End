import { createFileRoute, redirect } from '@tanstack/react-router'

/** Ruta `/contenido`: lleva a la primera página de contenido, `/contenido/inicio`. */
export const Route = createFileRoute('/_authenticated/contenido/')({
  beforeLoad: () => {
    throw redirect({ to: '/contenido/inicio', replace: true })
  },
})
