import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { cx } from '@/components/ui/cx'
import { manrope } from '../fonts'
import '../globals.css'
import { Providers } from '../providers'
import { PAGE_BACKGROUND, SITE_METADATA, SITE_VIEWPORT } from '../site-shell'

/** Título, descripción y `metadataBase` comunes (ver {@link SITE_METADATA}). */
export const metadata: Metadata = SITE_METADATA

/** Color de la barra del navegador en el celular (ver {@link SITE_VIEWPORT}). */
export const viewport: Viewport = SITE_VIEWPORT

/** Props de {@link SimulatorRootLayout}. */
interface SimulatorRootLayoutProps {
  /** La página del simulador. */
  children: ReactNode
}

/**
 * Root layout pelado del simulador de Mercado Pago del modo de prueba (`/checkout/mp-simulado`):
 * el mismo idioma, tipografía, estilos, proveedores y fondo que la tienda, pero sin barra superior,
 * encabezado, pie ni panel del carrito, porque el desafío 3-D Secure lo abre en un iframe del
 * checkout. Al ser otro root layout, ir de la tienda al simulador (o volver) recarga la página.
 *
 * @param props - Ver {@link SimulatorRootLayoutProps}.
 */
export default function SimulatorRootLayout({ children }: SimulatorRootLayoutProps): ReactNode {
  return (
    <html lang="es-AR" className={manrope.variable}>
      <body>
        <Providers>
          <div className={cx('relative min-h-screen overflow-x-clip text-pretty', PAGE_BACKGROUND)}>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}
