import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { inter } from './fonts'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: { default: 'Galpón Mates', template: '%s · Galpón Mates' },
  description: 'Mates, bombillones y yerba con envío a todo el país.',
}

export const viewport: Viewport = {
  themeColor: '#1a1210',
}

/** Props de {@link RootLayout}. */
interface RootLayoutProps {
  /** La página que se está mostrando. */
  children: ReactNode
}

/**
 * Estructura común de todas las páginas de la tienda: idioma, tipografía y proveedores del cliente.
 *
 * @param props - Ver {@link RootLayoutProps}.
 */
export default function RootLayout({ children }: RootLayoutProps): ReactNode {
  return (
    <html lang="es-AR" className={inter.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
